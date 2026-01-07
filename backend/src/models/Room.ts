import { supabase } from '../config/database';
import { Room, BlockedTime } from '../../shared/types';

export class RoomModel {
  static async findBySession(
    sessionId: string,
    roomType?: string
  ): Promise<Room[]> {
    let query = supabase
      .from('rooms')
      .select('*')
      .eq('session_id', sessionId);

    if (roomType) {
      query = query.eq('room_type', roomType);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(room: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        session_id: room.session_id,
        name: room.name,
        room_type: room.room_type,
        capacity: room.capacity,
        location: room.location || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createMany(
    rooms: Array<Omit<Room, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .insert(rooms)
      .select();

    if (error) throw error;
    return data || [];
  }

  static async update(
    id: string,
    updates: Partial<Omit<Room, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
  ): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
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
      .from('rooms')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getAvailability(roomId: string): Promise<BlockedTime[]> {
    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('scope', 'room')
      .eq('scope_id', roomId);

    if (error) throw error;
    return data || [];
  }

  static async setAvailability(
    roomId: string,
    sessionId: string,
    blockedSlots: Array<{ day: string; timeslot_id: string }>
  ): Promise<void> {
    // Delete existing blocked times for this room
    const { error: deleteError } = await supabase
      .from('blocked_times')
      .delete()
      .eq('scope', 'room')
      .eq('scope_id', roomId);

    if (deleteError) throw deleteError;

    // Insert new blocked times
    if (blockedSlots.length > 0) {
      const blockedTimes = blockedSlots.map((slot) => ({
        session_id: sessionId,
        scope: 'room' as const,
        scope_id: roomId,
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
}

