import { supabase } from '../config/database';
import { Lecturer, BlockedTime } from '../../shared/types';

export class LecturerModel {
  static async findBySession(sessionId: string): Promise<Lecturer[]> {
    const { data, error } = await supabase
      .from('lecturers')
      .select('*')
      .eq('session_id', sessionId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<Lecturer | null> {
    const { data, error } = await supabase
      .from('lecturers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(lecturer: Omit<Lecturer, 'id' | 'created_at' | 'updated_at'>): Promise<Lecturer> {
    const { data, error } = await supabase
      .from('lecturers')
      .insert({
        session_id: lecturer.session_id,
        name: lecturer.name,
        email: lecturer.email || null,
        department: lecturer.department || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createMany(
    lecturers: Array<Omit<Lecturer, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Lecturer[]> {
    const { data, error } = await supabase
      .from('lecturers')
      .insert(lecturers)
      .select();

    if (error) throw error;
    return data || [];
  }

  static async update(
    id: string,
    updates: Partial<Omit<Lecturer, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
  ): Promise<Lecturer> {
    const { data, error } = await supabase
      .from('lecturers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('lecturers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getAvailability(lecturerId: string): Promise<BlockedTime[]> {
    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('scope', 'lecturer')
      .eq('scope_id', lecturerId);

    if (error) throw error;
    return data || [];
  }

  static async setAvailability(
    lecturerId: string,
    sessionId: string,
    blockedSlots: Array<{ day: string; timeslot_id: string }>
  ): Promise<void> {
    // Delete existing blocked times for this lecturer
    const { error: deleteError } = await supabase
      .from('blocked_times')
      .delete()
      .eq('scope', 'lecturer')
      .eq('scope_id', lecturerId);

    if (deleteError) throw deleteError;

    // Insert new blocked times
    if (blockedSlots.length > 0) {
      const blockedTimes = blockedSlots.map((slot) => ({
        session_id: sessionId,
        scope: 'lecturer' as const,
        scope_id: lecturerId,
        day: slot.day,
        timeslot_id: slot.timeslot_id,
        reason: null,
      }));

      const { error: insertError } = await supabase
        .from('blocked_times')
        .insert(blockedTimes);

      if (insertError) throw insertError;
    }
  }

  static async getAssignedOfferingsCount(lecturerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('lecturer_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('lecturer_id', lecturerId);

    if (error) throw error;
    return count || 0;
  }
}

