import type { Product } from './types';

/**
 * Semantic verification of BM25 matches before fusion. A keyword match survives only if
 * its image is at least as similar to the query as the weakest vector candidate, which
 * drops wrong-sense matches like "Denim" deodorant for "denims". The floor comes from the
 * vector candidate pool itself, so there is no threshold to tune.
 */
export function verifyLexical(lexical: Product[], vector: Product[]): { kept: Product[]; dropped: number } {
  const similarities = vector.map((p) => p.similarity).filter((s): s is number => s !== undefined);
  if (similarities.length === 0) return { kept: lexical, dropped: 0 };
  const floor = Math.min(...similarities);
  const kept = lexical.filter((p) => p.similarity !== undefined && p.similarity >= floor);
  return { kept, dropped: lexical.length - kept.length };
}
