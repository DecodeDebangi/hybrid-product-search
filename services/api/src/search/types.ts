export type Mode = 'lexical' | 'vector' | 'hybrid';
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
}
