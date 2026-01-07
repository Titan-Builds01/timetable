import { supabase } from '../config/database';
import { Export } from '../../shared/types';

export class ExportModel {
  static async create(exportRecord: Omit<Export, 'id' | 'created_at'>): Promise<Export> {
    const { data, error } = await supabase
      .from('exports')
      .insert({
        run_id: exportRecord.run_id,
        format: exportRecord.format,
        file_path: exportRecord.file_path,
        created_by: exportRecord.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByRun(runId: string): Promise<Export[]> {
    const { data, error } = await supabase
      .from('exports')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

