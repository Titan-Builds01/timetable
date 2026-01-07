import { Router, Response } from 'express';
import { CanonicalCourseModel } from '../../models/CanonicalCourse';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, CanonicalCourse } from '../../shared/types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/canonical-courses - List canonical courses
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const canonicals = await CanonicalCourseModel.findAll();

    const response: ApiResponse<CanonicalCourse[]> = {
      success: true,
      data: canonicals,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch canonical courses',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/canonical-courses/:id - Get canonical course by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const canonical = await CanonicalCourseModel.findById(id);

    if (!canonical) {
      const response: ApiResponse = {
        success: false,
        error: 'Canonical course not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<CanonicalCourse> = {
      success: true,
      data: canonical,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch canonical course',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/canonical-courses - Create canonical course (Admin/Coordinator only)
router.post('/', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { canonical_title, department } = req.body;

    if (!canonical_title) {
      const response: ApiResponse = {
        success: false,
        error: 'canonical_title is required',
      };
      return res.status(400).json(response);
    }

    const canonical = await CanonicalCourseModel.create({
      canonical_title,
      department: department || null,
    });

    const response: ApiResponse<CanonicalCourse> = {
      success: true,
      data: canonical,
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create canonical course',
    };
    res.status(500).json(response);
  }
});

export default router;

