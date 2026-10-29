export type Mode = 'lexical' | 'vector' | 'hybrid';
export type Fusion = 'rrf' | 'weighted' | 'verified';

export interface FusionOptions {
  strategy: Fusion;
  /** RRF weight for BM25 results under the `weighted` strategy; vector results keep weight 1. */
  lexicalWeight: number;
}
export type Source = 'lexical' | 'vector';

export interface Filters {
  gender?: string;
  articleType?: string;
  baseColour?: string;
  usage?: string;
}

export interface Product {
  id: string;
  name: string;
  gender?: string;
  articleType?: string;
  baseColour?: string;
  usage?: string;
  season?: string;
  year?: number;
  image: string;
  /** Similarity of the product image to the query embedding, when the query had one. */
  similarity?: number;
}

export interface Hit extends Product {
  score: number;
  ranks: Partial<Record<Source, number>>;
}

export interface Timings {
  embedMs?: number;
  lexicalMs?: number;
  vectorMs?: number;
  totalMs: number;
}

export interface SearchResponse {
  mode: Mode | 'image' | 'similar';
  hits: Hit[];
  timings: Timings;
  embeddingCached?: boolean;
  /** Hybrid only: how results were fused, and how many BM25 matches verification kept or dropped. */
  fusion?: { strategy: Fusion; droppedLexical?: number; keptLexical?: number };
  /** Product types detected in the query; keyword matches were limited to them. */
  understanding?: { productTypes: string[] };
}
