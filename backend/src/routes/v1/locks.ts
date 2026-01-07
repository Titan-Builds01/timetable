import { Router, Response } from 'express';
import { LockModel } from '../../models/Lock';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, Lock } from '../../shared/types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/locks - List locks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'session_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const locks = await LockModel.findBySession(session_id);

    const response: ApiResponse<Lock[]> = {
      success: true,
      data: locks,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch locks',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/locks/:id - Get lock by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lock = await LockModel.findById(id);

    if (!lock) {
      const response: ApiResponse = {
        success: false,
        error: 'Lock not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Lock> = {
      success: true,
      data: lock,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch lock',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/locks - Create lock (Admin/Coordinator only)
router.post('/', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, event_id, day, timeslot_id, second_timeslot_id, room_id } = req.body;

    if (!session_id || !event_id || !day || !timeslot_id || !room_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id, event_id, day, timeslot_id, and room_id are required',
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

    // Check if lock already exists for this event
    const existingLocks = await LockModel.findBySession(session_id);
    const existingLock = existingLocks.find((l) => l.event_id === event_id);

    if (existingLock) {
      // Update existing lock
      const updated = await LockModel.update(existingLock.id, {
        day,
        timeslot_id,
        second_timeslot_id: second_timeslot_id || null,
        room_id,
      });

      const response: ApiResponse<Lock> = {
        success: true,
        data: updated,
        message: 'Lock updated successfully',
      };
      return res.json(response);
    }

    // Create new lock
    const lock = await LockModel.create({
      session_id,
      event_id,
      day,
      timeslot_id,
      second_timeslot_id: second_timeslot_id || null,
      room_id,
      created_by: req.user.id,
    });

    const response: ApiResponse<Lock> = {
      success: true,
      data: lock,
      message: 'Lock created successfully',
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create lock',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/v1/locks/:id - Remove lock (Admin/Coordinator only)
router.delete('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await LockModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Lock removed successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to remove lock',
    };
    res.status(500).json(response);
  }
});

export default router;

