import { supabase } from '../config/database';
import { BlockedTime } from '../../shared/types';

export class BlockedTimeModel {
  static async findBySession(
    sessionId: string,
    scope?: string,
    scopeId?: string
  ): Promise<BlockedTime[]> {
    let query = supabase
      .from('blocked_times')
      .select('*')
      .eq('session_id', sessionId);

    if (scope) {
      query = query.eq('scope', scope);
    }

    if (scopeId !== undefined) {
      query = query.eq('scope_id', scopeId);
    }

    const { data, error } = await query.order('day', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<BlockedTime | null> {
    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(blockedTime: Omit<BlockedTime, 'id' | 'created_at'>): Promise<BlockedTime> {
    const { data, error } = await supabase
      .from('blocked_times')
      .insert({
        session_id: blockedTime.session_id,
        scope: blockedTime.scope,
        scope_id: blockedTime.scope_id,
        day: blockedTime.day,
        timeslot_id: blockedTime.timeslot_id,
        reason: blockedTime.reason,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async createSportTemplate(sessionId: string, level: number = 300): Promise<BlockedTime> {
    // Find TS8 timeslot for this session
    const { data: ts8, error: tsError } = await supabase
      .from('timeslots')
      .select('id')
      .eq('session_id', sessionId)
      .eq('sort_order', 8)
      .single();

    if (tsError || !ts8) {
      throw new Error('TS8 timeslot not found for session');
    }

    const { data, error } = await supabase
      .from('blocked_times')
      .insert({
        session_id: sessionId,
        scope: 'level',
        scope_id: level.toString(),
        day: 'THU',
        timeslot_id: ts8.id,
        reason: `SPORT (${level} level)`,
      })
      .select()
      .single();

    if (error) {
      // If already exists, return existing
      if (error.code === '23505') {
        const existing = await this.findBySession(sessionId, 'level', level.toString());
        return existing.find(bt => bt.day === 'THU' && bt.timeslot_id === ts8.id)!;
      }
      throw error;
    }

    return data;
  }

  static async createJumatTemplate(sessionId: string, level: number = 300): Promise<BlockedTime> {
    // Find TS8 timeslot for this session
    const { data: ts8, error: tsError } = await supabase
      .from('timeslots')
      .select('id')
      .eq('session_id', sessionId)
      .eq('sort_order', 8)
      .single();

    if (tsError || !ts8) {
      throw new Error('TS8 timeslot not found for session');
    }

    const { data, error } = await supabase
      .from('blocked_times')
      .insert({
        session_id: sessionId,
        scope: 'level',
        scope_id: level.toString(),
        day: 'FRI',
        timeslot_id: ts8.id,
        reason: `JUMAT (${level} level)`,
      })
      .select()
      .single();

    if (error) {
      // If already exists, return existing
      if (error.code === '23505') {
        const existing = await this.findBySession(sessionId, 'level', level.toString());
        return existing.find(bt => bt.day === 'FRI' && bt.timeslot_id === ts8.id)!;
      }
      throw error;
    }

    return data;
  }
}

