import * as XLSX from 'xlsx';

export interface ExcelRow {
  [key: string]: string | number;
}

export class ExcelParser {
  static parse(buffer: Buffer, sheetIndex: number = 0): ExcelRow[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[sheetIndex];
      
      if (!sheetName) {
        throw new Error(`Sheet at index ${sheetIndex} not found`);
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // Convert all values to strings
        defval: '', // Default value for empty cells
      });

      // Convert all values to strings for consistency
      return rows.map((row: any) => {
        const stringRow: ExcelRow = {};
        for (const [key, value] of Object.entries(row)) {
          stringRow[key] = String(value || '');
        }
        return stringRow;
      }) as ExcelRow[];
    } catch (error) {
      throw new Error(`Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

