import { supabase } from '../config/database';

export interface MatchingSuggestion {
  id: string;
  offering_id: string;
  canonical_course_id: string;
  score: number;
  token_overlap: string | null;
  method: string;
  created_at: string;
}

export class MatchingSuggestionModel {
  static async findByOffering(offeringId: string): Promise<MatchingSuggestion[]> {
    const { data, error } = await supabase
      .from('matching_suggestions')
      .select('*')
      .eq('offering_id', offeringId)
      .order('score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createMany(suggestions: Array<Omit<MatchingSuggestion, 'id' | 'created_at'>>): Promise<void> {
    if (suggestions.length === 0) return;

    // Delete existing suggestions for these offerings
    const offeringIds = [...new Set(suggestions.map((s) => s.offering_id))];
    await supabase.from('matching_suggestions').delete().in('offering_id', offeringIds);

    // Insert new suggestions
    const { error } = await supabase.from('matching_suggestions').insert(suggestions);

    if (error) throw error;
  }

  static async deleteByOffering(offeringId: string): Promise<void> {
    const { error } = await supabase
      .from('matching_suggestions')
      .delete()
      .eq('offering_id', offeringId);

    if (error) throw error;
  }
}

