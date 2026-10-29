import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { config } from '../config';
import type { Filters, Product } from '../search/types';

const MIN_KNN_TOP_K = 100;

const FIELDS = 'id,name,gender,article_type,base_colour,usage,season,year,image_path';

const FILTER_FIELDS: Record<keyof Filters, string> = {
  gender: 'gender',
  articleType: 'article_type',
  baseColour: 'base_colour',
  usage: 'usage',
};

export interface SolrResult {
  products: Product[];
  ms: number;
}

type SolrDoc = Record<string, any>;

@Injectable()
export class SolrService {
  /** With `queryVector`, each match also carries its image similarity to the query. */
  lexical(q: string, filters: Filters, limit: number, queryVector?: number[]): Promise<SolrResult> {
    return this.select({
      query: q,
      filter: toFilterQueries(filters),
      limit,
      fields: queryVector ? `${FIELDS},${similarityField(queryVector)}` : FIELDS,
      params: { defType: 'edismax', qf: 'name^3 search_text', pf: 'name^5', mm: '2<75%' },
    });
  }

  knn(vector: number[], filters: Filters, limit: number, excludeId?: string): Promise<SolrResult> {
    const filter = toFilterQueries(filters);
    if (excludeId) filter.push(`-id:${JSON.stringify(excludeId)}`);
    // HNSW is approximate: a tiny topK explores too little of the graph, so always search wider.
    const topK = Math.max(limit, MIN_KNN_TOP_K);
    return this.select({
      query: `{!knn f=image_vector topK=${topK}}[${vector.join(',')}]`,
      filter,
      limit,
      fields: `${FIELDS},${similarityField(vector)}`,
    });
  }

  async getVector(id: string): Promise<number[]> {
    const doc = (await this.request(`/get?id=${encodeURIComponent(id)}&fl=id,image_vector`)).doc;
    if (!doc) throw new NotFoundException(`Product ${id} not found`);
    return doc.image_vector;
  }

  async facets(): Promise<Record<keyof Filters, { value: string; count: number }[]>> {
    const terms = (field: string) => ({ type: 'terms', field, limit: 40, sort: 'count desc' });
    const res = await this.request('/select', {
      query: '*:*',
      limit: 0,
      facet: Object.fromEntries(Object.entries(FILTER_FIELDS).map(([key, field]) => [key, terms(field)])),
    });
    return Object.fromEntries(
      Object.keys(FILTER_FIELDS).map((key) => [
        key,
        (res.facets[key]?.buckets ?? []).map((b: SolrDoc) => ({ value: b.val, count: b.count })),
      ]),
    ) as Record<keyof Filters, { value: string; count: number }[]>;
  }

  private async select(body: object): Promise<SolrResult> {
    const start = performance.now();
    const res = await this.request('/select', body);
    return { products: res.response.docs.map(toProduct), ms: round(performance.now() - start) };
  }

  private async request(path: string, body?: object): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${config.solrUrl}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException('Solr is unreachable');
    }
    if (!res.ok) throw new ServiceUnavailableException(`Solr ${res.status}: ${await res.text()}`);
    return res.json();
  }
}

// Same measure the kNN index uses, so BM25 and vector candidates are directly comparable.
function similarityField(vector: number[]): string {
  return `similarity:vectorSimilarity(FLOAT32,DOT_PRODUCT,image_vector,[${vector.join(',')}])`;
}

function toFilterQueries(filters: Filters): string[] {
  return (Object.keys(FILTER_FIELDS) as (keyof Filters)[])
    .filter((key) => filters[key])
    .map((key) => `{!term f=${FILTER_FIELDS[key]}}${filters[key]}`);
}

function toProduct(doc: SolrDoc): Product {
  return {
    id: doc.id,
    name: doc.name,
    gender: doc.gender,
    articleType: doc.article_type,
    baseColour: doc.base_colour,
    usage: doc.usage,
    season: doc.season,
    year: doc.year,
    image: `/images/${doc.image_path}`,
    similarity: doc.similarity,
  };
}

export const round = (ms: number) => Math.round(ms * 100) / 100;
