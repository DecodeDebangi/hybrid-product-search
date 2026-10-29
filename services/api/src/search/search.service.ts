import { Injectable } from '@nestjs/common';
import { EmbedderService } from '../infra/embedder.service';
import { round, SolrResult, SolrService } from '../infra/solr.service';
import { MetricsService } from './metrics.service';
import { ProductTypeService } from './product-types.service';
import { RankedList, reciprocalRankFusion } from './rrf';
import type { Filters, FusionOptions, Mode, Product, SearchResponse, Source, Timings } from './types';
import { verifyLexical } from './verify';

// Each retriever contributes this many candidates before fusion.
const HYBRID_CANDIDATES = 100;
const RRF_K = 60;

export const DEFAULT_FUSION: FusionOptions = { strategy: 'rrf', lexicalWeight: 1 };
export const DEFAULT_TYPE_AWARE = true;

@Injectable()
export class SearchService {
  constructor(
    private readonly solr: SolrService,
    private readonly embedder: EmbedderService,
    private readonly metrics: MetricsService,
    private readonly productTypes: ProductTypeService,
  ) {}

  async search(
    q: string,
    mode: Mode,
    filters: Filters,
    limit: number,
    fusion: FusionOptions = DEFAULT_FUSION,
    typeAware = DEFAULT_TYPE_AWARE,
  ): Promise<SearchResponse> {
    const start = performance.now();
    const pool = mode === 'hybrid' ? Math.max(HYBRID_CANDIDATES, limit) : limit;
    const verify = mode === 'hybrid' && fusion.strategy === 'verified';
    const timings: Partial<Timings> = {};

    // A type the shopper picked as a filter already constrains both retrievers.
    const productTypes =
      typeAware && mode !== 'vector' && !filters.articleType ? await this.productTypes.detect(q) : [];
    const understanding = productTypes.length ? { productTypes } : undefined;

    const embedding = mode !== 'lexical' ? this.embedder.embedText(q) : undefined;
    const [lexical, vector, embedded] = await Promise.all([
      mode === 'vector'
        ? undefined
        : verify
          ? embedding!.then((e) =>
              this.solr.lexical(q, filters, pool, { queryVector: e.vector, articleTypes: productTypes }),
            )
          : this.solr.lexical(q, filters, pool, { articleTypes: productTypes }),
      embedding?.then((e) => this.solr.knn(e.vector, filters, pool)),
      embedding,
    ]);
    timings.embedMs = embedded?.ms;
    timings.lexicalMs = lexical?.ms;
    timings.vectorMs = vector?.ms;

    if (mode !== 'hybrid') {
      const response = this.respond(mode, start, timings, limit, { lexical, vector }, {}, embedded?.cached);
      return { ...response, understanding };
    }

    let fusedLexical = lexical;
    let droppedLexical: number | undefined;
    let keptLexical: number | undefined;
    if (verify && lexical && vector) {
      const { kept, dropped } = verifyLexical(lexical.products, vector.products);
      fusedLexical = { ...lexical, products: kept };
      droppedLexical = dropped;
      keptLexical = kept.length;
    }
    const weights = fusion.strategy === 'weighted' ? { lexical: fusion.lexicalWeight } : {};
    const response = this.respond(mode, start, timings, limit, { lexical: fusedLexical, vector }, weights, embedded?.cached);
    return { ...response, understanding, fusion: { strategy: fusion.strategy, droppedLexical, keptLexical } };
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
    weights: Partial<Record<Source, number>> = {},
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

    const hits = reciprocalRankFusion(lists, RRF_K, weights)
      .slice(0, limit)
      .map(({ id, score, ranks }) => ({ ...products.get(id)!, score: round(score * 1000), ranks }));

    const totalMs = round(performance.now() - start);
    this.metrics.record(mode, totalMs);
    return { mode, hits, timings: { ...timings, totalMs }, embeddingCached };
  }
}
