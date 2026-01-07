import { supabase } from '../config/database';
import { CanonicalCourse } from '../../shared/types';
import { normalizeTitle } from '../services/matching/normalizer';

export class CanonicalCourseModel {
  static async findAll(): Promise<CanonicalCourse[]> {
    const { data, error } = await supabase
      .from('canonical_courses')
      .select('*')
      .order('canonical_title', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id: string): Promise<CanonicalCourse | null> {
    const { data, error } = await supabase
      .from('canonical_courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async findByNormalizedTitle(normalizedTitle: string): Promise<CanonicalCourse | null> {
    const { data, error } = await supabase
      .from('canonical_courses')
      .select('*')
      .eq('normalized_title', normalizedTitle)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async findByNormalizedCode(normalizedCode: string): Promise<CanonicalCourse | null> {
    // Check aliases first
    const { data: alias, error: aliasError } = await supabase
      .from('course_aliases')
      .select('canonical_course_id')
      .eq('normalized_code', normalizedCode)
      .limit(1)
      .single();

    if (!aliasError && alias) {
      return this.findById(alias.canonical_course_id);
    }

    return null;
  }

  static async create(
    canonical: Omit<CanonicalCourse, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CanonicalCourse> {
    const normalizedTitle = normalizeTitle(canonical.canonical_title);

    const { data, error } = await supabase
      .from('canonical_courses')
      .insert({
        canonical_title: canonical.canonical_title,
        normalized_title: normalizedTitle,
        department: canonical.department || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

