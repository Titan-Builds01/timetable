// Course code normalization
export function normalizeCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[\s\-/]/g, '') // Remove spaces, hyphens, slashes
    .replace(/[^A-Z0-9]/g, ''); // Keep alphanumeric only
}

// Course title normalization
export function normalizeTitle(
  title: string,
  config?: { removeStopwords?: boolean }
): string {
  let normalized = title
    .trim()
    .toUpperCase()
    .replace(/[,.:\-]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' '); // Collapse whitespace

  if (config?.removeStopwords) {
    const stopwords = ['THE', 'AND', 'OF', 'A', 'AN', 'IN', 'ON', 'AT', 'TO', 'FOR'];
    normalized = normalized
      .split(' ')
      .filter((w) => !stopwords.includes(w))
      .join(' ');
  }

  return normalized;
}

