import { Router, Response } from 'express';
import multer from 'multer';
import { RoomModel } from '../../models/Room';
import { CSVParser } from '../../services/import/csv-parser';
import { ExcelParser } from '../../services/import/excel-parser';
import { ImportValidator } from '../../services/import/validator';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optional-auth';
import { requireRole } from '../../middleware/roles';
import { ApiResponse, Room } from '../../shared/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/v1/rooms/import - Import rooms (Admin/Coordinator only - requires auth)
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
      const validation = ImportValidator.validateRooms(rows);
      if (!validation.valid) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          data: validation.errors,
        };
        return res.status(400).json(response);
      }

      // Transform rows to rooms
      const rooms = rows.map((row) => ({
        session_id,
        name: String(row.name || '').trim(),
        room_type: String(row.room_type || row.roomType || '').toLowerCase().trim(),
        capacity: parseInt(String(row.capacity || '')),
        location: row.location ? String(row.location).trim() : null,
      }));

      // Create rooms
      const created = await RoomModel.createMany(rooms);

      const response: ApiResponse<{ count: number; rooms: Room[] }> = {
        success: true,
        data: {
          count: created.length,
          rooms: created,
        },
        message: `Successfully imported ${rooms.length} rooms`,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to import rooms',
      };
      res.status(500).json(response);
    }
  }
);

// GET /api/v1/rooms - List rooms (public)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, room_type } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'session_id query parameter is required',
      };
      return res.status(400).json(response);
    }

    const rooms = await RoomModel.findBySession(
      session_id,
      room_type as string | undefined
    );

    const response: ApiResponse<Room[]> = {
      success: true,
      data: rooms,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch rooms',
    };
    res.status(500).json(response);
  }
});

// GET /api/v1/rooms/:id - Get room by ID (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const room = await RoomModel.findById(id);

    if (!room) {
      const response: ApiResponse = {
        success: false,
        error: 'Room not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Room> = {
      success: true,
      data: room,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch room',
    };
    res.status(500).json(response);
  }
});

// PATCH /api/v1/rooms/:id - Update room (Admin/Coordinator only)
router.patch('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, room_type, capacity, location } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (room_type !== undefined) updates.room_type = room_type;
    if (capacity !== undefined) updates.capacity = capacity;
    if (location !== undefined) updates.location = location;

    const room = await RoomModel.update(id, updates);

    const response: ApiResponse<Room> = {
      success: true,
      data: room,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to update room',
    };
    res.status(500).json(response);
  }
});

// PUT /api/v1/rooms/:id/availability - Replace room blocked slots (Admin/Coordinator only)
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

      await RoomModel.setAvailability(id, session_id, blocked_slots);

      const response: ApiResponse = {
        success: true,
        message: 'Room availability updated successfully',
      };
      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to update room availability',
      };
      res.status(500).json(response);
    }
  }
);

// DELETE /api/v1/rooms/:id - Delete room (Admin/Coordinator only)
router.delete('/:id', requireRole('admin', 'coordinator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await RoomModel.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Room deleted successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to delete room',
    };
    res.status(500).json(response);
  }
});

export default router;

