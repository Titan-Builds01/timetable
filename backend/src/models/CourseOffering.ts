import { supabase } from '../config/database';
import { CourseOffering } from '../../shared/types';
import { normalizeCode, normalizeTitle } from '../services/matching/normalizer';

export class CourseOfferingModel {
  static async findBySession(
    sessionId: string,
    matchStatus?: string
  ): Promise<CourseOffering[]> {
    let query = supabase
      .from('course_offerings')
      .select('*')
      .eq('session_id', sessionId);

    if (matchStatus) {
      query = query.eq('match_status', matchStatus);
    }

    const { data, error } = await query.order('course_code', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<CourseOffering | null> {
    const { data, error } = await supabase
      .from('course_offerings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(
    offering: Omit<CourseOffering, 'id' | 'created_at' | 'updated_at' | 'match_status' | 'canonical_course_id' | 'matched_by' | 'matched_at' | 'match_method' | 'match_score'>
  ): Promise<CourseOffering> {
    const normalizedCode = normalizeCode(offering.course_code);
    const normalizedTitle = normalizeTitle(offering.original_title);

    const { data, error } = await supabase
      .from('course_offerings')
      .insert({
        session_id: offering.session_id,
        course_code: offering.course_code,
        normalized_code: normalizedCode,
        original_title: offering.original_title,
        normalized_title: normalizedTitle,
        level: offering.level,
        credit_units: offering.credit_units,
        type: offering.type,
        department: offering.department || null,
        match_status: 'unresolved',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createMany(
    offerings: Array<Omit<CourseOffering, 'id' | 'created_at' | 'updated_at' | 'match_status' | 'canonical_course_id' | 'matched_by' | 'matched_at' | 'match_method' | 'match_score'>>
  ): Promise<CourseOffering[]> {
    const normalizedOfferings = offerings.map((offering) => ({
      ...offering,
      normalized_code: normalizeCode(offering.course_code),
      normalized_title: normalizeTitle(offering.original_title),
      match_status: 'unresolved' as const,
      department: offering.department || null,
    }));

    const { data, error } = await supabase
      .from('course_offerings')
      .insert(normalizedOfferings)
      .select();

    if (error) throw error;
    return data || [];
  }

  static async update(
    id: string,
    updates: Partial<Omit<CourseOffering, 'id' | 'session_id' | 'created_at' | 'updated_at'>>
  ): Promise<CourseOffering> {
    const updateData: any = { ...updates };

    // Re-normalize if code or title changed
    if (updates.course_code) {
      updateData.normalized_code = normalizeCode(updates.course_code);
    }
    if (updates.original_title) {
      updateData.normalized_title = normalizeTitle(updates.original_title);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('course_offerings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('course_offerings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

