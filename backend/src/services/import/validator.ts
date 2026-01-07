export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class ImportValidator {
  static validateCourseOfferings(rows: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFields = ['course_code', 'title', 'level', 'credit_units', 'type'];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index is 0-based and we account for header

      // Check required fields
      for (const field of requiredFields) {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push({
            row: rowNum,
            field,
            message: `Missing required field: ${field}`,
          });
        }
      }

      // Validate level
      if (row.level) {
        const level = parseInt(String(row.level));
        if (isNaN(level) || level < 1) {
          errors.push({
            row: rowNum,
            field: 'level',
            message: 'Level must be a positive integer',
          });
        }
      }

      // Validate credit_units
      if (row.credit_units) {
        const units = parseInt(String(row.credit_units));
        if (isNaN(units) || units < 1) {
          errors.push({
            row: rowNum,
            field: 'credit_units',
            message: 'Credit units must be a positive integer',
          });
        }
      }

      // Validate type
      if (row.type) {
        const type = String(row.type).toLowerCase();
        if (!['lecture', 'lab', 'tutorial'].includes(type)) {
          errors.push({
            row: rowNum,
            field: 'type',
            message: 'Type must be one of: lecture, lab, tutorial',
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateLecturers(rows: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFields = ['name'];

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      for (const field of requiredFields) {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push({
            row: rowNum,
            field,
            message: `Missing required field: ${field}`,
          });
        }
      }

      // Validate email if provided
      if (row.email && String(row.email).trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(row.email))) {
          errors.push({
            row: rowNum,
            field: 'email',
            message: 'Invalid email format',
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateRooms(rows: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const requiredFields = ['name', 'room_type', 'capacity'];

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      for (const field of requiredFields) {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push({
            row: rowNum,
            field,
            message: `Missing required field: ${field}`,
          });
        }
      }

      // Validate room_type
      if (row.room_type) {
        const type = String(row.room_type).toLowerCase();
        if (!['lecture_room', 'lab', 'ict_room', 'hall'].includes(type)) {
          errors.push({
            row: rowNum,
            field: 'room_type',
            message: 'Room type must be one of: lecture_room, lab, ict_room, hall',
          });
        }
      }

      // Validate capacity
      if (row.capacity) {
        const capacity = parseInt(String(row.capacity));
        if (isNaN(capacity) || capacity < 1) {
          errors.push({
            row: rowNum,
            field: 'capacity',
            message: 'Capacity must be a positive integer',
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

