import { Injectable } from '@nestjs/common';
import { EmbedderService } from '../infra/embedder.service';
import { round, SolrResult, SolrService } from '../infra/solr.service';
import { MetricsService } from './metrics.service';
import { RankedList, reciprocalRankFusion } from './rrf';
import type { Filters, Mode, Product, SearchResponse, Timings } from './types';

// Each retriever contributes this many candidates before fusion.
const HYBRID_CANDIDATES = 100;

@Injectable()
export class SearchService {
  constructor(
    private readonly solr: SolrService,
    private readonly embedder: EmbedderService,
    private readonly metrics: MetricsService,
  ) {}

  async search(q: string, mode: Mode, filters: Filters, limit: number): Promise<SearchResponse> {
    const start = performance.now();
    const pool = mode === 'hybrid' ? Math.max(HYBRID_CANDIDATES, limit) : limit;
    const timings: Partial<Timings> = {};
    let embeddingCached: boolean | undefined;

    const [lexical, vector] = await Promise.all([
      mode !== 'vector' ? this.solr.lexical(q, filters, pool) : undefined,
      mode !== 'lexical'
        ? this.embedder.embedText(q).then((embedding) => {
            timings.embedMs = embedding.ms;
            embeddingCached = embedding.cached;
            return this.solr.knn(embedding.vector, filters, pool);
          })
        : undefined,
    ]);
    timings.lexicalMs = lexical?.ms;
    timings.vectorMs = vector?.ms;

    return this.respond(mode, start, timings, limit, { lexical, vector }, embeddingCached);
  }

  async searchByImage(file: Express.Multer.File, filters: Filters, limit: number): Promise<SearchResponse> {
    const start = performance.now();
    const embedding = await this.embedder.embedImage(file);
    const vector = await this.solr.knn(embedding.vector, filters, limit);
    return this.respond('image', start, { embedMs: embedding.ms, vectorMs: vector.ms }, limit, { vector });
  }

  async similar(id: string, limit: number): Promise<SearchResponse> {
    const start = performance.now();
    const vector = await this.solr.knn(await this.solr.getVector(id), {}, limit, id);
    return this.respond('similar', start, { vectorMs: vector.ms }, limit, { vector });
  }

  private respond(
    mode: SearchResponse['mode'],
    start: number,
    timings: Partial<Timings>,
    limit: number,
    results: { lexical?: SolrResult; vector?: SolrResult },
    embeddingCached?: boolean,
  ): SearchResponse {
    const products = new Map<string, Product>();
    const lists: RankedList[] = [];
    for (const source of ['lexical', 'vector'] as const) {
      const result = results[source];
      if (!result) continue;
      result.products.forEach((p) => products.set(p.id, p));
      lists.push({ source, ids: result.products.map((p) => p.id) });
    }

    const hits = reciprocalRankFusion(lists)
      .slice(0, limit)
      .map(({ id, score, ranks }) => ({ ...products.get(id)!, score: round(score * 1000), ranks }));

    const totalMs = round(performance.now() - start);
    this.metrics.record(mode, totalMs);
    return { mode, hits, timings: { ...timings, totalMs }, embeddingCached };
  }
}
