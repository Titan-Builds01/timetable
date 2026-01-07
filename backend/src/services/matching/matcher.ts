import { CourseOfferingModel } from '../../models/CourseOffering';
import { CanonicalCourseModel } from '../../models/CanonicalCourse';
import { CourseAliasModel } from '../../models/CourseAlias';
import { MatchingSuggestionModel } from '../../models/MatchingSuggestion';
import { normalizeCode, normalizeTitle } from './normalizer';
import { computeSimilarity, getTokenOverlap } from './scorer';
import { CourseOffering } from '../../../shared/types';

export interface MatchResult {
  status: 'auto_matched' | 'needs_review' | 'unresolved';
  canonical_id: string | null;
  method: string | null;
  score: number | null;
}

export class Matcher {
  // Rule 1: Exact code match
  static async matchByCode(offering: CourseOffering): Promise<string | null> {
    const normalizedCode = normalizeCode(offering.course_code);

    // Check aliases
    const aliasCanonicalId = await CourseAliasModel.findByNormalizedCode(normalizedCode);
    if (aliasCanonicalId) {
      return aliasCanonicalId;
    }

    // Check existing offerings with same code that are matched
    const existingOfferings = await CourseOfferingModel.findBySession(offering.session_id);
    const matchedOffering = existingOfferings.find(
      (o) => o.normalized_code === normalizedCode && o.canonical_course_id
    );

    if (matchedOffering && matchedOffering.canonical_course_id) {
      return matchedOffering.canonical_course_id;
    }

    return null;
  }

  // Rule 2: Exact normalized title match
  static async matchByTitle(offering: CourseOffering): Promise<string | null> {
    const normalizedTitle = normalizeTitle(offering.original_title);

    // Check canonical courses
    const canonical = await CanonicalCourseModel.findByNormalizedTitle(normalizedTitle);
    if (canonical) {
      return canonical.id;
    }

    // Check aliases
    const aliasCanonicalId = await CourseAliasModel.findByNormalizedTitle(normalizedTitle);
    if (aliasCanonicalId) {
      return aliasCanonicalId;
    }

    return null;
  }

  // Rule 3: Similarity match
  static async matchBySimilarity(offering: CourseOffering): Promise<{
    canonical_id: string | null;
    score: number;
    token_overlap: string;
  }> {
    const normalizedTitle = normalizeTitle(offering.original_title);
    const allCanonicals = await CanonicalCourseModel.findAll();

    if (allCanonicals.length === 0) {
      return { canonical_id: null, score: 0, token_overlap: '' };
    }

    const scores = allCanonicals.map((canonical) => {
      const score = computeSimilarity(
        normalizedTitle,
        canonical.normalized_title,
        offering.department === canonical.department
      );
      const token_overlap = getTokenOverlap(normalizedTitle, canonical.normalized_title);
      return {
        canonical_id: canonical.id,
        score,
        token_overlap,
      };
    });

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    return {
      canonical_id: best.canonical_id,
      score: best.score,
      token_overlap: best.token_overlap,
    };
  }

  // Main matching function - applies rules 1-5
  static async matchOffering(offering: CourseOffering): Promise<MatchResult> {
    // Rule 1: Exact code match
    const codeMatch = await this.matchByCode(offering);
    if (codeMatch) {
      return {
        status: 'auto_matched',
        canonical_id: codeMatch,
        method: 'exact_code',
        score: 1.0,
      };
    }

    // Rule 2: Exact normalized title match
    const titleMatch = await this.matchByTitle(offering);
    if (titleMatch) {
      return {
        status: 'auto_matched',
        canonical_id: titleMatch,
        method: 'exact_title',
        score: 1.0,
      };
    }

    // Rule 3: Similarity match
    const similarityResult = await this.matchBySimilarity(offering);

    if (similarityResult.score >= 0.92) {
      // Rule 3a: Auto-link
      return {
        status: 'auto_matched',
        canonical_id: similarityResult.canonical_id,
        method: 'similarity',
        score: similarityResult.score,
      };
    } else if (similarityResult.score >= 0.80) {
      // Rule 4: Needs review - store top 5 suggestions
      const allCanonicals = await CanonicalCourseModel.findAll();
      const normalizedTitle = normalizeTitle(offering.original_title);

      const allScores = allCanonicals.map((canonical) => {
        const score = computeSimilarity(
          normalizedTitle,
          canonical.normalized_title,
          offering.department === canonical.department
        );
        const token_overlap = getTokenOverlap(normalizedTitle, canonical.normalized_title);
        return {
          offering_id: offering.id,
          canonical_course_id: canonical.id,
          score,
          token_overlap,
          method: 'similarity',
        };
      });

      allScores.sort((a, b) => b.score - a.score);
      const top5 = allScores.slice(0, 5);

      await MatchingSuggestionModel.createMany(top5);

      return {
        status: 'needs_review',
        canonical_id: null,
        method: 'similarity',
        score: similarityResult.score,
      };
    } else {
      // Rule 5: Unresolved
      return {
        status: 'unresolved',
        canonical_id: null,
        method: null,
        score: null,
      };
    }
  }

  // Run matching for all unresolved offerings in a session
  static async runMatching(sessionId: string, userId: string): Promise<{
    auto_matched: number;
    needs_review: number;
    unresolved: number;
  }> {
    const offerings = await CourseOfferingModel.findBySession(sessionId, 'unresolved');

    let auto_matched = 0;
    let needs_review = 0;
    let unresolved = 0;

    for (const offering of offerings) {
      const result = await this.matchOffering(offering);

      // Update offering with match result
      const updateData: any = {
        match_status: result.status,
        canonical_course_id: result.canonical_id,
        match_method: result.method,
        match_score: result.score,
      };

      if (result.status === 'auto_matched' || result.status === 'needs_review') {
        updateData.matched_by = userId;
        updateData.matched_at = new Date().toISOString();
      }

      await CourseOfferingModel.update(offering.id, updateData);

      // Create alias if auto-matched
      if (result.status === 'auto_matched' && result.canonical_id) {
        await CourseAliasModel.createFromOffering(offering, result.canonical_id, 'auto');
      }

      if (result.status === 'auto_matched') auto_matched++;
      else if (result.status === 'needs_review') needs_review++;
      else unresolved++;
    }

    return { auto_matched, needs_review, unresolved };
  }
}

