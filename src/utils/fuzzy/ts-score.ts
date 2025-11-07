export const tsScore = (query: string, candidate: string): number => {
  if (!query) return 0;
  const q = query.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!q || !c) return 0;
  let score = 0;
  let qi = 0;
  let consecutive = 0;
  for (let i = 0; i < c.length && qi < q.length; i += 1) {
    if (c[i] === q[qi]) {
      score += consecutive ? 2 : 1;
      qi += 1;
      consecutive = 1;
    } else if (c[i] === q[qi].toUpperCase()) {
      score += 1;
      qi += 1;
      consecutive = 0;
    } else {
      consecutive = 0;
    }
  }
  if (qi !== q.length) {
    score -= (q.length - qi) * 0.25;
  }
  const denominator = q.length || 1;
  return Math.max(0, Math.min(1, score / denominator));
};
