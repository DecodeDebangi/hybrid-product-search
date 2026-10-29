import type { Source } from './types';

export interface RankedList {
  source: Source;
  ids: string[];
}

export interface Fused {
  id: string;
  score: number;
  ranks: Partial<Record<Source, number>>;
}

/**
 * Reciprocal Rank Fusion: score = sum of 1 / (k + rank) across lists.
 * Rank-based, so BM25 and cosine scores never need to be on the same scale.
 */
export function reciprocalRankFusion(lists: RankedList[], k = 60): Fused[] {
  const fused = new Map<string, Fused>();
  for (const { source, ids } of lists) {
    ids.forEach((id, index) => {
      const rank = index + 1;
      const entry = fused.get(id) ?? { id, score: 0, ranks: {} };
      entry.score += 1 / (k + rank);
      entry.ranks[source] = rank;
      fused.set(id, entry);
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score);
}
