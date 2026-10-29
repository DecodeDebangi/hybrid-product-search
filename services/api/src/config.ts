import { resolve } from 'node:path';

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  solrUrl: process.env.SOLR_URL ?? 'http://localhost:8983/solr/products',
  embedderUrl: process.env.EMBEDDER_URL ?? 'http://localhost:8001',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  imagesDir: resolve(process.env.IMAGES_DIR ?? resolve(__dirname, '../../../data/images')),
};
