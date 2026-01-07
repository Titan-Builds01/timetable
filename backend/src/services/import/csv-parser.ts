import { parse } from 'csv-parse/sync';
import { Readable } from 'stream';

export interface CSVRow {
  [key: string]: string;
}

export class CSVParser {
  static async parse(buffer: Buffer): Promise<CSVRow[]> {
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records as CSVRow[];
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async parseStream(stream: Readable): Promise<CSVRow[]> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const records = await this.parse(buffer);
          resolve(records);
        } catch (error) {
          reject(error);
        }
      });
      stream.on('error', reject);
    });
  }
}

