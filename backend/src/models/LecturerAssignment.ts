import { supabase } from '../config/database';
import { LecturerAssignment } from '../../shared/types';

export class LecturerAssignmentModel {
  static async findByOffering(offeringId: string): Promise<LecturerAssignment[]> {
    const { data, error } = await supabase
      .from('lecturer_assignments')
      .select('*')
      .eq('offering_id', offeringId);

    if (error) throw error;
    return data || [];
  }

  static async findByLecturer(lecturerId: string): Promise<LecturerAssignment[]> {
    const { data, error } = await supabase
      .from('lecturer_assignments')
      .select('*')
      .eq('lecturer_id', lecturerId);

    if (error) throw error;
    return data || [];
  }

  static async create(
    assignment: Omit<LecturerAssignment, 'id' | 'created_at'>
  ): Promise<LecturerAssignment> {
    const { data, error } = await supabase
      .from('lecturer_assignments')
      .insert({
        session_id: assignment.session_id,
        offering_id: assignment.offering_id,
        lecturer_id: assignment.lecturer_id,
        share: assignment.share || 1.0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('lecturer_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async deleteByOfferingAndLecturer(
    offeringId: string,
    lecturerId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('lecturer_assignments')
      .delete()
      .eq('offering_id', offeringId)
      .eq('lecturer_id', lecturerId);

    if (error) throw error;
  }
}

