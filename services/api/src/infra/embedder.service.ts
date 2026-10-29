import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../config';
import { round } from './solr.service';

const CACHE_TTL_SECONDS = 60 * 60 * 24;

export interface Embedding {
  vector: number[];
  ms: number;
  cached: boolean;
}

@Injectable()
export class EmbedderService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbedderService.name);
  private readonly redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

  constructor() {
    // The cache is an optimization; search keeps working without Redis.
    this.redis.on('error', (err) => this.logger.warn(`Redis unavailable: ${err.message}`));
  }

  async embedText(text: string): Promise<Embedding> {
    const start = performance.now();
    const key = `emb:v1:${text.trim().toLowerCase()}`;
    const cached = await this.redis.get(key).catch(() => null);
    if (cached) return { vector: JSON.parse(cached), ms: round(performance.now() - start), cached: true };

    const { vectors } = await this.post('/embed/text', {
      body: JSON.stringify({ texts: [text] }),
      headers: { 'content-type': 'application/json' },
    });
    await this.redis.set(key, JSON.stringify(vectors[0]), 'EX', CACHE_TTL_SECONDS).catch(() => undefined);
    return { vector: vectors[0], ms: round(performance.now() - start), cached: false };
  }

  async embedImage(file: Express.Multer.File): Promise<Embedding> {
    const start = performance.now();
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    const { vector } = await this.post('/embed/image', { body: form });
    return { vector, ms: round(performance.now() - start), cached: false };
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  private async post(path: string, init: RequestInit): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${config.embedderUrl}${path}`, { method: 'POST', ...init });
    } catch {
      throw new ServiceUnavailableException('Embedding service is unreachable');
    }
    if (!res.ok) throw new ServiceUnavailableException(`Embedder ${res.status}: ${await res.text()}`);
    return res.json();
  }
}
