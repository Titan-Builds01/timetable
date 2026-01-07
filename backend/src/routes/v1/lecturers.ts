import { Router, Response } from 'express';
import multer from 'multer';
import { LecturerModel } from '../../models/Lecturer';
import { CSVParser } from '../../services/import/csv-parser';
import { ExcelParser } from '../../services/import/excel-parser';
import { ImportValidator } from '../../services/import/validator';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, Lecturer } from '../../shared/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/v1/lecturers/import - Import lecturers (Admin/Coordinator only - requires auth)
router.post(
  '/import',
  authenticateToken,
  requireRole('admin', 'coordinator'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded',
        };
        return res.status(400).json(response);
      }

      const { session_id } = req.body;
      if (!session_id) {
        const response: ApiResponse = {
          success: false,
          error: 'session_id is required',
        };
        return res.status(400).json(response);
      }

      let rows: any[];
      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        rows = await CSVParser.parse(req.file.buffer);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        rows = ExcelParser.parse(req.file.buffer);
      } else {
        const response: ApiResponse = {
          success: false,
          error: 'Unsupported file format. Use CSV or Excel (.xlsx, .xls)',
        };
        return res.status(400).json(response);
      }

      // Validate rows
      const validation = ImportValidator.validateLecturers(rows);
      if (!validation.valid) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          data: validation.errors,
        };
        return res.status(400).json(response);
      }

      // Transform rows to lecturers
      const lecturers = rows.map((row) => ({
        session_id,
        name: String(row.name || '').trim(),
        email: row.email ? String(row.email).trim() : null,
        department: row.department ? String(row.department).trim() : null,
      }));

      // Create lecturers
      const created = await LecturerModel.createMany(lecturers);

      const response: ApiResponse<{ count: number; lecturers: Lecturer[] }> = {
        success: true,
        data: {
          count: created.length,
          lecturers: created,
        },
        message: `Successfully imported ${created.length} lecturers`,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to import lecturers',
      };
      res.status(500).json(response);
    }
  }
);

// GET /api/v1/lecturers - List lecturers (public)
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

    const lecturers = await LecturerModel.findBySession(session_id);

    // Get assigned offerings count for each lecturer
    const lecturersWithCounts = await Promise.all(
      lecturers.map(async (lecturer) => {
        const count = await LecturerModel.getAssignedOfferingsCount(lecturer.id);
        return { ...lecturer, assigned_offerings_count: count };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: lecturersWithCounts,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch lecturers',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/lecturers/:id - Get lecturer by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lecturer = await LecturerModel.findById(id);

    if (!lecturer) {
      const response: ApiResponse = {
        success: false,
        error: 'Lecturer not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Lecturer> = {
      success: true,
      data: lecturer,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch lecturer',
    };
    res.status(500).json(response);
  }
});

// PATCH /api/v1/lecturers/:id - Update lecturer (Admin/Coordinator only)
router.patch('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, department } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (department !== undefined) updates.department = department;

    const lecturer = await LecturerModel.update(id, updates);

    const response: ApiResponse<Lecturer> = {
      success: true,
      data: lecturer,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update lecturer',
    };
    res.status(500).json(response);
  }
});

// PUT /api/v1/lecturers/:id/availability - Replace lecturer blocked slots (Admin/Coordinator only)
router.put(
  '/:id/availability',
  requireRole('admin', 'coordinator'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { session_id, blocked_slots } = req.body;

      if (!session_id) {
        const response: ApiResponse = {
          success: false,
          error: 'session_id is required',
        };
        return res.status(400).json(response);
      }

      if (!Array.isArray(blocked_slots)) {
        const response: ApiResponse = {
          success: false,
          error: 'blocked_slots must be an array',
        };
        return res.status(400).json(response);
      }

      await LecturerModel.setAvailability(id, session_id, blocked_slots);

      const response: ApiResponse = {
        success: true,
        message: 'Lecturer availability updated successfully',
      };
      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to update lecturer availability',
      };
      res.status(500).json(response);
    }
  }
);

// DELETE /api/v1/lecturers/:id - Delete lecturer (Admin/Coordinator only)
router.delete('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await LecturerModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Lecturer deleted successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete lecturer',
    };
    res.status(500).json(response);
  }
});

export default router;

