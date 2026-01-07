import { Router, Response } from 'express';
import { Allocator } from '../../services/scheduling/allocator';
import { EventModel } from '../../models/Event';
import { TimeSlotModel } from '../../models/TimeSlot';
import { RoomModel } from '../../models/Room';
import { BlockedTimeModel } from '../../models/BlockedTime';
import { LockModel } from '../../models/Lock';
import { ConstraintsModel } from '../../models/Constraints';
import { ScheduleRunModel } from '../../models/ScheduleRun';
import { supabase } from '../../config/database';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, ScheduleRun } from '../../shared/types';

const router = Router();

// POST /api/v1/runs/generate - Generate timetable run (Admin/Coordinator only - requires auth)
router.post('/generate', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, seed, candidate_limit } = req.body;

    if (!session_id) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id is required',
      };
      return res.status(400).json(response);
    }

    // Create run record with status 'running'
    const run = await ScheduleRunModel.create({
      session_id,
      seed: seed || null,
      candidate_limit: candidate_limit || 25,
      optimization_iterations: 0,
      scheduled_count: 0,
      unscheduled_count: 0,
      soft_score: 0,
      status: 'running',
      error_message: null,
    });

    try {
      // Load all required data
      const events = await EventModel.findBySession(session_id);
      const timeslots = await TimeSlotModel.findBySession(session_id);
      const rooms = await RoomModel.findBySession(session_id);
      const blockedTimes = await BlockedTimeModel.findBySession(session_id);
      const locks = await LockModel.findBySession(session_id);
      let constraints = await ConstraintsModel.findBySession(session_id);
      
      if (!constraints) {
        constraints = await ConstraintsModel.getDefaultConstraints();
        await ConstraintsModel.createOrUpdate(session_id, constraints);
      }

      // Generate schedule
      const result = await Allocator.generateSchedule(
        session_id,
        events,
        timeslots,
        rooms,
        blockedTimes,
        locks,
        constraints,
        seed || null,
        candidate_limit || 25
      );

      // Update run with results
      await ScheduleRunModel.update(run.id, {
        scheduled_count: result.scheduledCount,
        unscheduled_count: result.unscheduledCount,
        soft_score: result.softScore,
        status: 'completed',
      });

      // Save scheduled and unscheduled events
      await ScheduleRunModel.createScheduledEvents(
        run.id,
        result.scheduled.map((se) => ({ ...se, run_id: run.id }))
      );
      await ScheduleRunModel.createUnscheduledEvents(
        run.id,
        result.unscheduled.map((ue) => ({ ...ue, run_id: run.id }))
      );

      const response: ApiResponse<ScheduleRun> = {
        success: true,
        data: await ScheduleRunModel.findById(run.id),
        message: `Schedule generated: ${result.scheduledCount} scheduled, ${result.unscheduledCount} unscheduled`,
      };
      res.json(response);
    } catch (error: any) {
      // Update run with error
      await ScheduleRunModel.update(run.id, {
        status: 'failed',
        error_message: error.message || 'Unknown error',
      });

      throw error;
    }
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to generate schedule',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/runs - List runs (public)
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

    const runs = await ScheduleRunModel.findBySession(session_id);

    const response: ApiResponse<ScheduleRun[]> = {
      success: true,
      data: runs,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch runs',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/runs/:runId - Get run by ID (public)
router.get('/:runId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;
    const run = await ScheduleRunModel.findById(runId);

    if (!run) {
      const response: ApiResponse = {
        success: false,
        error: 'Schedule run not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ScheduleRun> = {
      success: true,
      data: run,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch run',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/runs/:runId/timetable - Get timetable data (public)
router.get('/:runId/timetable', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;
    const { view, filter_id } = req.query; // view: level|lecturer|room, filter_id: specific ID

    const { data: scheduled, error } = await supabase
      .from('scheduled_events')
      .select('*')
      .eq('run_id', runId);

    if (error) throw error;

    // Filter based on view type
    let filtered = scheduled || [];
    if (view && filter_id) {
      // Would need to join with events/offerings/lecturers/rooms to filter
      // Simplified for now
    }

    const response: ApiResponse = {
      success: true,
      data: filtered,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch timetable',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/runs/:runId/unscheduled - Get unscheduled events (public)
router.get('/:runId/unscheduled', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;

    const { data, error } = await supabase
      .from('unscheduled_events')
      .select('*')
      .eq('run_id', runId);

    if (error) throw error;

    const response: ApiResponse = {
      success: true,
      data: data || [],
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch unscheduled events',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/runs/:runId/summary - Get summary + score
router.get('/:runId/summary', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;
    const run = await ScheduleRunModel.findById(runId);

    if (!run) {
      const response: ApiResponse = {
        success: false,
        error: 'Schedule run not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        scheduled_count: run.scheduled_count,
        unscheduled_count: run.unscheduled_count,
        soft_score: run.soft_score,
        status: run.status,
        created_at: run.created_at,
      },
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch summary',
    };
    res.status(500).json(response);
  }
});

export default router;

