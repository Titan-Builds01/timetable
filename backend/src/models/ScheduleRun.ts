import { supabase } from '../config/database';
import { ScheduleRun, ScheduledEvent, UnscheduledEvent } from '../../shared/types';

export class ScheduleRunModel {
  static async create(run: Omit<ScheduleRun, 'id' | 'created_at' | 'completed_at'>): Promise<ScheduleRun> {
    const { data, error } = await supabase
      .from('schedule_runs')
      .insert({
        session_id: run.session_id,
        seed: run.seed,
        candidate_limit: run.candidate_limit,
        optimization_iterations: run.optimization_iterations,
        scheduled_count: run.scheduled_count,
        unscheduled_count: run.unscheduled_count,
        soft_score: run.soft_score,
        status: run.status,
        error_message: run.error_message || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(
    id: string,
    updates: Partial<Omit<ScheduleRun, 'id' | 'created_at'>>
  ): Promise<ScheduleRun> {
    const { data, error } = await supabase
      .from('schedule_runs')
      .update({
        ...updates,
        completed_at: updates.status === 'completed' || updates.status === 'failed' 
          ? new Date().toISOString() 
          : undefined,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id: string): Promise<ScheduleRun | null> {
    const { data, error } = await supabase
      .from('schedule_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async findBySession(sessionId: string): Promise<ScheduleRun[]> {
    const { data, error } = await supabase
      .from('schedule_runs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createScheduledEvents(
    runId: string,
    scheduled: Omit<ScheduledEvent, 'id' | 'created_at'>[]
  ): Promise<void> {
    if (scheduled.length === 0) return;

    const eventsToInsert = scheduled.map((se) => ({
      run_id: runId,
      event_id: se.event_id,
      day: se.day,
      timeslot_id: se.timeslot_id,
      second_timeslot_id: se.second_timeslot_id,
      room_id: se.room_id,
    }));

    const { error } = await supabase.from('scheduled_events').insert(eventsToInsert);

    if (error) throw error;
  }

  static async createUnscheduledEvents(
    runId: string,
    unscheduled: Omit<UnscheduledEvent, 'id' | 'created_at'>[]
  ): Promise<void> {
    if (unscheduled.length === 0) return;

    const eventsToInsert = unscheduled.map((ue) => ({
      run_id: runId,
      event_id: ue.event_id,
      reason: ue.reason,
    }));

    const { error } = await supabase.from('unscheduled_events').insert(eventsToInsert);

    if (error) throw error;
  }
}

