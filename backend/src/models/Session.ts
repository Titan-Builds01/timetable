import { supabase } from '../config/database';
import { Session } from '../../shared/types';

export class SessionModel {
  static async findAll(): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async findActive(): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(session: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        name: session.name,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
        is_active: session.is_active,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, updates: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
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

  static async setActive(id: string): Promise<void> {
    // First, deactivate all sessions
    const { error: deactivateError } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .neq('id', id);

    if (deactivateError) throw deactivateError;

    // Then activate the specified session
    const { error: activateError } = await supabase
      .from('sessions')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (activateError) throw activateError;
  }

  static async seedDefaultTimeslots(sessionId: string): Promise<void> {
    const { error } = await supabase.rpc('seed_default_timeslots', {
      p_session_id: sessionId,
    });

    if (error) throw error;
  }
}

