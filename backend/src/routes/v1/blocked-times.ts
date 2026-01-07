import { Router, Response } from 'express';
import { BlockedTimeModel } from '../../models/BlockedTime';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, BlockedTime } from '../../shared/types';

const router = Router();

// GET /api/v1/blocked-times - List blocked times (public)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, scope, scope_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'session_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const blockedTimes = await BlockedTimeModel.findBySession(
      session_id,
      scope as string | undefined,
      scope_id as string | undefined
    );

    const response: ApiResponse<BlockedTime[]> = {
      success: true,
      data: blockedTimes,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch blocked times',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/blocked-times/:id - Get blocked time by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const blockedTime = await BlockedTimeModel.findById(id);

    if (!blockedTime) {
      const response: ApiResponse = {
        success: false,
        error: 'Blocked time not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<BlockedTime> = {
      success: true,
      data: blockedTime,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch blocked time',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/blocked-times - Create blocked time (Admin/Coordinator only)
router.post('/', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, scope, scope_id, day, timeslot_id, reason } = req.body;

    if (!session_id || !scope || !day || !timeslot_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id, scope, day, and timeslot_id are required',
      };
      return res.status(400).json(response);
    }

    const blockedTime = await BlockedTimeModel.create({
      session_id,
      scope,
      scope_id: scope_id || null,
      day,
      timeslot_id,
      reason: reason || null,
    });

    const response: ApiResponse<BlockedTime> = {
      success: true,
      data: blockedTime,
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create blocked time',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/v1/blocked-times/:id - Delete blocked time (Admin/Coordinator only)
router.delete('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await BlockedTimeModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Blocked time deleted successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete blocked time',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/blocked-times/templates/sport - Create Sport template (Admin/Coordinator only)
router.post('/templates/sport', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, level } = req.body;

    if (!session_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id is required',
      };
      return res.status(400).json(response);
    }

    const blockedTime = await BlockedTimeModel.createSportTemplate(session_id, level || 300);

    const response: ApiResponse<BlockedTime> = {
      success: true,
      data: blockedTime,
      message: 'Sport template created successfully',
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create Sport template',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/blocked-times/templates/jumat - Create Jumat template (Admin/Coordinator only)
router.post('/templates/jumat', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, level } = req.body;

    if (!session_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id is required',
      };
      return res.status(400).json(response);
    }

    const blockedTime = await BlockedTimeModel.createJumatTemplate(session_id, level || 300);

    const response: ApiResponse<BlockedTime> = {
      success: true,
      data: blockedTime,
      message: 'Jumat template created successfully',
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create Jumat template',
    };
    res.status(500).json(response);
  }
});

export default router;

