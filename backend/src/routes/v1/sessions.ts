import { Router, Response } from 'express';
import { SessionModel } from '../../models/Session';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, Session } from '../../shared/types';

const router = Router();

// GET routes are public (optional auth)
// Write routes require authentication

// GET /api/v1/sessions - List all sessions (public)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await SessionModel.findAll();
    const response: ApiResponse<Session[]> = {
      success: true,
      data: sessions,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch sessions',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/sessions/:id - Get session by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await SessionModel.findById(id);

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Session> = {
      success: true,
      data: session,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch session',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/sessions - Create session (Admin/Coordinator only - requires auth)
router.post('/', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, starts_at, ends_at, is_active } = req.body;

    if (!name) {
      const response: ApiResponse = {
        success: false,
        error: 'Session name is required',
      };
      return res.status(400).json(response);
    }

    const session = await SessionModel.create({
      name,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
      is_active: is_active || false,
    });

    // Auto-seed default timeslots if this is a new session
    try {
      await SessionModel.seedDefaultTimeslots(session.id);
    } catch (seedError) {
      console.warn('Failed to seed default timeslots:', seedError);
      // Continue even if seeding fails
    }

    const response: ApiResponse<Session> = {
      success: true,
      data: session,
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create session',
    };
    res.status(500).json(response);
  }
});

// PATCH /api/v1/sessions/:id - Update session (Admin/Coordinator only - requires auth)
router.patch('/:id', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, starts_at, ends_at, is_active } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (starts_at !== undefined) updates.starts_at = starts_at;
    if (ends_at !== undefined) updates.ends_at = ends_at;
    if (is_active !== undefined) updates.is_active = is_active;

    const session = await SessionModel.update(id, updates);

    const response: ApiResponse<Session> = {
      success: true,
      data: session,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update session',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/sessions/:id/set-active - Set active session (Admin/Coordinator only - requires auth)
router.post('/:id/set-active', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify session exists
    const session = await SessionModel.findById(id);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found',
      };
      return res.status(404).json(response);
    }

    await SessionModel.setActive(id);

    const response: ApiResponse = {
      success: true,
      message: 'Session activated successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to set active session',
    };
    res.status(500).json(response);
  }
});

export default router;

