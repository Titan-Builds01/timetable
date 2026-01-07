import { Router, Response } from 'express';
import { PDFGenerator } from '../../services/export/pdf-generator';
import { CSVGenerator } from '../../services/export/csv-generator';
import { ScheduleRunModel } from '../../models/ScheduleRun';
import { ExportModel } from '../../models/Export';
import { EventModel } from '../../models/Event';
import { TimeSlotModel } from '../../models/TimeSlot';
import { RoomModel } from '../../models/Room';
import { CourseOfferingModel } from '../../models/CourseOffering';
import { supabase } from '../../config/database';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse } from '../../shared/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/v1/exports/pdf - Export timetable to PDF (Admin/Coordinator only)
router.post('/pdf', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { run_id, view_type, filter_id } = req.body;

    if (!run_id) {
      const response: ApiResponse = {
        success: false,
        error: 'run_id is required',
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

    // Get run
    const run = await ScheduleRunModel.findById(run_id);
    if (!run) {
      const response: ApiResponse = {
        success: false,
        error: 'Schedule run not found',
      };
      return res.status(404).json(response);
    }

    // Get scheduled events
    const { data: scheduled, error: scheduledError } = await supabase
      .from('scheduled_events')
      .select('*')
      .eq('run_id', run_id);

    if (scheduledError) throw scheduledError;

    // Get related data
    const timeslots = await TimeSlotModel.findBySession(run.session_id);
    const rooms = await RoomModel.findBySession(run.session_id);
    const events = await EventModel.findBySession(run.session_id);
    const offerings = await CourseOfferingModel.findBySession(run.session_id);

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateToBuffer(
      scheduled || [],
      timeslots,
      rooms,
      events,
      offerings,
      (view_type as 'level' | 'lecturer' | 'room') || 'level',
      filter_id
    );

    // Save file
    const exportsDir = join(process.cwd(), 'exports');
    await mkdir(exportsDir, { recursive: true });

    const filename = `timetable_${run_id}_${Date.now()}.pdf`;
    const filePath = join(exportsDir, filename);
    await writeFile(filePath, pdfBuffer);

    // Create export record
    await ExportModel.create({
      run_id,
      format: 'pdf',
      file_path: filePath,
      created_by: req.user.id,
    });

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF export error:', error);
    // If headers not sent, send JSON error
    if (!res.headersSent) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to export PDF',
      };
      res.status(500).json(response);
    } else {
      // Headers already sent, can't send JSON - log error
      console.error('Cannot send error response, headers already sent');
    }
  }
});

// POST /api/v1/exports/csv - Export timetable to CSV (Admin/Coordinator only)
router.post('/csv', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { run_id } = req.body;

    if (!run_id) {
      const response: ApiResponse = {
        success: false,
        error: 'run_id is required',
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

    // Get run
    const run = await ScheduleRunModel.findById(run_id);
    if (!run) {
      const response: ApiResponse = {
        success: false,
        error: 'Schedule run not found',
      };
      return res.status(404).json(response);
    }

    // Get scheduled events
    const { data: scheduled, error: scheduledError } = await supabase
      .from('scheduled_events')
      .select('*')
      .eq('run_id', run_id);

    if (scheduledError) throw scheduledError;

    // Get related data
    const timeslots = await TimeSlotModel.findBySession(run.session_id);
    const rooms = await RoomModel.findBySession(run.session_id);
    const events = await EventModel.findBySession(run.session_id);
    const offerings = await CourseOfferingModel.findBySession(run.session_id);

    // Generate CSV
    const csvContent = CSVGenerator.generate(
      scheduled || [],
      timeslots,
      rooms,
      events,
      offerings
    );

    // Save file
    const exportsDir = join(process.cwd(), 'exports');
    await mkdir(exportsDir, { recursive: true });

    const filename = `timetable_${run_id}_${Date.now()}.csv`;
    const filePath = join(exportsDir, filename);
    await writeFile(filePath, csvContent, 'utf-8');

    // Create export record
    await ExportModel.create({
      run_id,
      format: 'csv',
      file_path: filePath,
      created_by: req.user.id,
    });

    // Send file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('CSV export error:', error);
    // If headers not sent, send JSON error
    if (!res.headersSent) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to export CSV',
      };
      res.status(500).json(response);
    } else {
      // Headers already sent, can't send JSON - log error
      console.error('Cannot send error response, headers already sent');
    }
  }
});

export default router;

