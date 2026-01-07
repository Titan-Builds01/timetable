import { Router, Response } from 'express';
import { ConstraintsModel } from '../../models/Constraints';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, ConstraintsConfig } from '../../shared/types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/constraints - Get constraints for session
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

    let constraints = await ConstraintsModel.findBySession(session_id);

    // Return default if not found
    if (!constraints) {
      constraints = await ConstraintsModel.getDefaultConstraints();
    }

    const response: ApiResponse<ConstraintsConfig> = {
      success: true,
      data: constraints,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch constraints',
    };
    res.status(500).json(response);
  }
});

// PUT /api/v1/constraints - Update constraints for session (Admin/Coordinator only)
router.put('/', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, config } = req.body;

    if (!session_id || !config) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id and config are required',
      };
      return res.status(400).json(response);
    }

    const updated = await ConstraintsModel.createOrUpdate(session_id, config);

    const response: ApiResponse<ConstraintsConfig> = {
      success: true,
      data: updated,
      message: 'Constraints updated successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update constraints',
    };
    res.status(500).json(response);
  }
});

export default router;

