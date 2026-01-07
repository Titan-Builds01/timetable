import { Router, Response } from 'express';
import multer from 'multer';
import { CourseOfferingModel } from '../../models/CourseOffering';
import { CSVParser } from '../../services/import/csv-parser';
import { ExcelParser } from '../../services/import/excel-parser';
import { ImportValidator } from '../../services/import/validator';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, CourseOffering } from '../../shared/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/v1/course-offerings/import - Import course offerings (Admin/Coordinator only - requires auth)
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

      // Parse file based on extension
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
      const validation = ImportValidator.validateCourseOfferings(rows);
      if (!validation.valid) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          data: validation.errors,
        };
        return res.status(400).json(response);
      }

      // Transform rows to offerings
      const offerings = rows.map((row) => ({
        session_id,
        course_code: String(row.course_code || row.courseCode || '').trim(),
        original_title: String(row.title || row.course_title || row.courseTitle || '').trim(),
        level: parseInt(String(row.level || '')),
        credit_units: parseInt(String(row.credit_units || row.creditUnits || row.units || '')),
        type: String(row.type || '').toLowerCase().trim(),
        department: row.department ? String(row.department).trim() : null,
      }));

      // Create offerings
      const created = await CourseOfferingModel.createMany(offerings);

      const response: ApiResponse<{ count: number; offerings: CourseOffering[] }> = {
        success: true,
        data: {
          count: created.length,
          offerings: created,
        },
        message: `Successfully imported ${created.length} course offerings`,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to import course offerings',
      };
      res.status(500).json(response);
    }
  }
);

// GET /api/v1/course-offerings - List course offerings (public)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, match_status } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'session_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const offerings = await CourseOfferingModel.findBySession(
      session_id,
      match_status as string | undefined
    );

    const response: ApiResponse<CourseOffering[]> = {
      success: true,
      data: offerings,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch course offerings',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/course-offerings/:id - Get course offering by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const offering = await CourseOfferingModel.findById(id);

    if (!offering) {
      const response: ApiResponse = {
        success: false,
        error: 'Course offering not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<CourseOffering> = {
      success: true,
      data: offering,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch course offering',
    };
    res.status(500).json(response);
  }
});

// PATCH /api/v1/course-offerings/:id - Update course offering (Admin/Coordinator only - requires auth)
router.patch('/:id', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { course_code, original_title, level, credit_units, type, department } = req.body;

    const updates: any = {};
    if (course_code !== undefined) updates.course_code = course_code;
    if (original_title !== undefined) updates.original_title = original_title;
    if (level !== undefined) updates.level = level;
    if (credit_units !== undefined) updates.credit_units = credit_units;
    if (type !== undefined) updates.type = type;
    if (department !== undefined) updates.department = department;

    const offering = await CourseOfferingModel.update(id, updates);

    const response: ApiResponse<CourseOffering> = {
      success: true,
      data: offering,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update course offering',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/v1/course-offerings/:id - Delete course offering (Admin/Coordinator only - requires auth)
router.delete('/:id', authenticateToken, requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await CourseOfferingModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Course offering deleted successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete course offering',
    };
    res.status(500).json(response);
  }
});

export default router;

