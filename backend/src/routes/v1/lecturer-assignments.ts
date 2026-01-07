import { Router, Response } from 'express';
import { LecturerAssignmentModel } from '../../models/LecturerAssignment';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, LecturerAssignment } from '../../shared/types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/lecturer-assignments - List assignments
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { offering_id, lecturer_id } = req.query;

    let assignments: LecturerAssignment[];

    if (offering_id) {
      assignments = await LecturerAssignmentModel.findByOffering(offering_id as string);
    } else if (lecturer_id) {
      assignments = await LecturerAssignmentModel.findByLecturer(lecturer_id as string);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'offering_id or lecturer_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse<LecturerAssignment[]> = {
      success: true,
      data: assignments,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch lecturer assignments',
    };
    res.status(500).json(response);
  }
});

// POST /api/v1/lecturer-assignments - Create assignment (Admin/Coordinator only)
router.post('/', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, offering_id, lecturer_id, share } = req.body;

    if (!session_id || !offering_id || !lecturer_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id, offering_id, and lecturer_id are required',
      };
      return res.status(400).json(response);
    }

    const assignment = await LecturerAssignmentModel.create({
      session_id,
      offering_id,
      lecturer_id,
      share: share || 1.0,
    });

    const response: ApiResponse<LecturerAssignment> = {
      success: true,
      data: assignment,
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create lecturer assignment',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/v1/lecturer-assignments/:id - Remove assignment (Admin/Coordinator only)
router.delete('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await LecturerAssignmentModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Lecturer assignment removed successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to remove lecturer assignment',
    };
    res.status(500).json(response);
  }
});

export default router;

