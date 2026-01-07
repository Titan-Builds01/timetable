import { Router, Response } from 'express';
import { EventModel } from '../../models/Event';
import { EventExpander } from '../../services/scheduling/event-expander';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, Event } from '../../shared/types';

const router = Router();

// POST /api/v1/events/generate - Expand offerings to events (Admin/Coordinator only - requires auth)
router.post('/generate', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id is required',
      };
      return res.status(400).json(response);
    }

    const result = await EventExpander.expandAllOfferings(session_id);

    const response: ApiResponse<{ count: number; events: Event[] }> = {
      success: true,
      data: result,
      message: `Successfully generated ${result.count} events from matched offerings`,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to generate events',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/events - List events (public)
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

    const events = await EventModel.findBySession(session_id);

    const response: ApiResponse<Event[]> = {
      success: true,
      data: events,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch events',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/events/:id - Get event by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const event = await EventModel.findById(id);

    if (!event) {
      const response: ApiResponse = {
        success: false,
        error: 'Event not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Event> = {
      success: true,
      data: event,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch event',
    };
    res.status(500).json(response);
  }
});

export default router;

