import { supabase } from '../config/database';
import { Lock } from '../../shared/types';

export class LockModel {
  static async findBySession(sessionId: string): Promise<Lock[]> {
    const { data, error } = await supabase
      .from('locks')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<Lock | null> {
    const { data, error } = await supabase
      .from('locks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(lock: Omit<Lock, 'id' | 'created_at'>): Promise<Lock> {
    const { data, error } = await supabase
      .from('locks')
      .insert({
        session_id: lock.session_id,
        event_id: lock.event_id,
        day: lock.day,
        timeslot_id: lock.timeslot_id,
        second_timeslot_id: lock.second_timeslot_id || null,
        room_id: lock.room_id,
        created_by: lock.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(
    id: string,
    updates: Partial<Omit<Lock, 'id' | 'session_id' | 'created_by' | 'created_at'>>
  ): Promise<Lock> {
    const { data, error } = await supabase
      .from('locks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('locks').delete().eq('id', id);

    if (error) throw error;
  }

  static async deleteByEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from('locks').delete().eq('event_id', eventId);

    if (error) throw error;
  }
}

