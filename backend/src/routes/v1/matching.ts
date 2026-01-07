import { Router, Response } from 'express';
import { Matcher } from '../../services/matching/matcher';
import { CourseOfferingModel } from '../../models/CourseOffering';
import { MatchingSuggestionModel } from '../../models/MatchingSuggestion';
import { CourseAliasModel } from '../../models/CourseAlias';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse } from '../../shared/types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/v1/matching/run - Run matching for all unresolved offerings (Admin/Coordinator only)
router.post('/run', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id is required',
      };
      return res.status(400).json(response);
    }

    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      return res.status(401).json(response);
    }

    const results = await Matcher.runMatching(session_id, req.user.id);

    const response: ApiResponse = {
      success: true,
      data: results,
      message: `Matching completed: ${results.auto_matched} auto-matched, ${results.needs_review} need review, ${results.unresolved} unresolved`,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to run matching',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/matching/review-items - List offerings needing review
router.get('/review-items', async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'session_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const offerings = await CourseOfferingModel.findBySession(session_id, 'needs_review');

    // Get suggestions for each offering
    const offeringsWithSuggestions = await Promise.all(
      offerings.map(async (offering) => {
        const suggestions = await MatchingSuggestionModel.findByOffering(offering.id);
        return {
          ...offering,
          suggestions,
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: offeringsWithSuggestions,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch review items',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/matching/approve - Approve offering->canonical link (Admin/Coordinator only)
router.post('/approve', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { offering_id, canonical_course_id, method, score } = req.body;

    if (!offering_id || !canonical_course_id) {
      const response: ApiResponse = {
        success: false,
        error: 'offering_id and canonical_course_id are required',
      };
      return res.status(400).json(response);
    }

    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      return res.status(401).json(response);
    }

    // Get offering
    const offering = await CourseOfferingModel.findById(offering_id);
    if (!offering) {
      const response: ApiResponse = {
        success: false,
        error: 'Course offering not found',
      };
      return res.status(404).json(response);
    }

    // Update offering
    await CourseOfferingModel.update(offering.id, {
      match_status: 'manual_matched',
      canonical_course_id,
      matched_by: req.user.id,
      matched_at: new Date().toISOString(),
      match_method: method || 'manual_review',
      match_score: score || null,
    });

    // Create alias (critical for future matching)
    await CourseAliasModel.createFromOffering(offering, canonical_course_id, 'manual_confirm');

    // Delete suggestions for this offering
    await MatchingSuggestionModel.deleteByOffering(offering_id);

    const response: ApiResponse = {
      success: true,
      data: {
        offering_id,
        canonical_course_id,
        alias_created: true,
      },
      message: 'Offering matched and alias created successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to approve matching',
    };
    res.status(500).json(response);
  }
});

export default router;

