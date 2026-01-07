import { supabase } from '../config/database';
import { TimeSlot } from '../../shared/types';

export class TimeSlotModel {
  static async findBySession(sessionId: string): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('timeslots')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<TimeSlot | null> {
    const { data, error } = await supabase
      .from('timeslots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(timeslot: Omit<TimeSlot, 'id' | 'created_at'>): Promise<TimeSlot> {
    const { data, error } = await supabase
      .from('timeslots')
      .insert({
        session_id: timeslot.session_id,
        label: timeslot.label,
        start_time: timeslot.start_time,
        end_time: timeslot.end_time,
        sort_order: timeslot.sort_order,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, updates: Partial<Omit<TimeSlot, 'id' | 'session_id' | 'created_at'>>): Promise<TimeSlot> {
    const { data, error } = await supabase
      .from('timeslots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async reorder(sessionId: string, reorderMap: { id: string; sort_order: number }[]): Promise<void> {
    // Update each timeslot's sort_order
    for (const item of reorderMap) {
      const { error } = await supabase
        .from('timeslots')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('session_id', sessionId);

      if (error) throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('timeslots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

