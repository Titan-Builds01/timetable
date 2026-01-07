import { Router, Response } from 'express';
import { TimeSlotModel } from '../../models/TimeSlot';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, TimeSlot } from '../../shared/types';

const router = Router();

// GET /api/v1/timeslots - List timeslots by session (public)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'session_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const timeslots = await TimeSlotModel.findBySession(session_id);
    const response: ApiResponse<TimeSlot[]> = {
      success: true,
      data: timeslots,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch timeslots',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/timeslots/:id - Get timeslot by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const timeslot = await TimeSlotModel.findById(id);

    if (!timeslot) {
      const response: ApiResponse = {
        success: false,
        error: 'Timeslot not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<TimeSlot> = {
      success: true,
      data: timeslot,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch timeslot',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/timeslots - Create timeslot (Admin/Coordinator only - requires auth)
router.post('/', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, label, start_time, end_time, sort_order } = req.body;

    if (!session_id || !label || !start_time || !end_time || sort_order === undefined) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id, label, start_time, end_time, and sort_order are required',
      };
      return res.status(400).json(response);
    }

    const timeslot = await TimeSlotModel.create({
      session_id,
      label,
      start_time,
      end_time,
      sort_order,
    });

    const response: ApiResponse<TimeSlot> = {
      success: true,
      data: timeslot,
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create timeslot',
    };
    res.status(500).json(response);
  }
});

// PATCH /api/v1/timeslots/:id - Update timeslot (Admin/Coordinator only - requires auth)
router.patch('/:id', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { label, start_time, end_time, sort_order } = req.body;

    const updates: any = {};
    if (label !== undefined) updates.label = label;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const timeslot = await TimeSlotModel.update(id, updates);

    const response: ApiResponse<TimeSlot> = {
      success: true,
      data: timeslot,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update timeslot',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/timeslots/reorder - Bulk update sort_order (Admin/Coordinator only)
router.post('/reorder', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, reorder_map } = req.body;

    if (!session_id || !Array.isArray(reorder_map)) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id and reorder_map array are required',
      };
      return res.status(400).json(response);
    }

    await TimeSlotModel.reorder(session_id, reorder_map);

    const response: ApiResponse = {
      success: true,
      message: 'Timeslots reordered successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to reorder timeslots',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/v1/timeslots/:id - Delete timeslot (Admin/Coordinator only - requires auth)
router.delete('/:id', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await TimeSlotModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Timeslot deleted successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete timeslot',
    };
    res.status(500).json(response);
  }
});

export default router;

