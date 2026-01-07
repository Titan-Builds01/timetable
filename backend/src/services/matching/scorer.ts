// Token set Jaccard similarity
export function tokenSetJaccard(str1: string, str2: string): number {
  const tokens1 = new Set(
    str1
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );
  const tokens2 = new Set(
    str2
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );

  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// Character trigram cosine similarity
export function charTrigramCosine(str1: string, str2: string): number {
  const getTrigrams = (s: string): Map<string, number> => {
    const trigrams = new Map<string, number>();
    for (let i = 0; i <= s.length - 3; i++) {
      const trigram = s.substring(i, i + 3);
      trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
    }
    return trigrams;
  };

  const t1 = getTrigrams(str1);
  const t2 = getTrigrams(str2);
  const allTrigrams = new Set([...t1.keys(), ...t2.keys()]);

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const trigram of allTrigrams) {
    const v1 = t1.get(trigram) || 0;
    const v2 = t2.get(trigram) || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

// Combined similarity score
export function computeSimilarity(
  offeringTitle: string,
  canonicalTitle: string,
  departmentMatch?: boolean
): number {
  const jaccard = tokenSetJaccard(offeringTitle, canonicalTitle);
  const trigram = charTrigramCosine(offeringTitle, canonicalTitle);
  let score = 0.6 * jaccard + 0.4 * trigram;

  if (departmentMatch) {
    score += 0.02; // Bonus for department match
    score = Math.min(score, 1.0); // Cap at 1.0
  }

  return score;
}

// Get token overlap for explanation
export function getTokenOverlap(str1: string, str2: string): string {
  const tokens1 = new Set(
    str1
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );
  const tokens2 = new Set(
    str2
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );

  const intersection = [...tokens1].filter((t) => tokens2.has(t));
  return intersection.join(', ');
}

