import { supabase } from '../config/database';
import { CourseOffering } from '../../shared/types';
import { normalizeCode, normalizeTitle } from '../services/matching/normalizer';

export class CourseAliasModel {
  static async findByNormalizedTitle(normalizedTitle: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('course_aliases')
      .select('canonical_course_id')
      .eq('normalized_title', normalizedTitle)
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.canonical_course_id;
  }

  static async findByNormalizedCode(normalizedCode: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('course_aliases')
      .select('canonical_course_id')
      .eq('normalized_code', normalizedCode)
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.canonical_course_id;
  }

  static async createFromOffering(
    offering: CourseOffering,
    canonicalCourseId: string,
    source: 'auto' | 'manual_confirm' = 'manual_confirm'
  ): Promise<void> {
    const normalizedCode = normalizeCode(offering.course_code);
    const normalizedTitle = normalizeTitle(offering.original_title);

    // Check if alias already exists
    const { data: existing } = await supabase
      .from('course_aliases')
      .select('id')
      .eq('canonical_course_id', canonicalCourseId)
      .eq('normalized_title', normalizedTitle)
      .limit(1)
      .single();

    if (existing) {
      // Update existing alias
      await supabase
        .from('course_aliases')
        .update({
          normalized_code: normalizedCode,
          source,
          confidence: source === 'manual_confirm' ? 1.0 : 0.9,
        })
        .eq('id', existing.id);
    } else {
      // Create new alias
      await supabase.from('course_aliases').insert({
        canonical_course_id: canonicalCourseId,
        course_code: offering.course_code,
        normalized_code: normalizedCode,
        original_title: offering.original_title,
        normalized_title: normalizedTitle,
        source,
        confidence: source === 'manual_confirm' ? 1.0 : 0.9,
      });
    }
  }
}

