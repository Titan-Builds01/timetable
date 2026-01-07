import { supabase } from '../config/database';
import { Event } from '../../shared/types';

export class EventModel {
  static async findBySession(sessionId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('offering_id', { ascending: true })
      .order('event_index', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findByOffering(offeringId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('offering_id', offeringId)
      .order('event_index', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        session_id: event.session_id,
        offering_id: event.offering_id,
        lecturer_id: event.lecturer_id,
        event_index: event.event_index,
        duration_slots: event.duration_slots,
        room_type_required: event.room_type_required,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteBySession(sessionId: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('session_id', sessionId);

    if (error) throw error;
  }

  static async deleteByOffering(offeringId: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('offering_id', offeringId);

    if (error) throw error;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) throw error;
  }
}

