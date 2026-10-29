# Findwise

Visual and semantic product search over a 44k-item fashion catalog. Search by text or by photo, and compare keyword (BM25), vector (CLIP) and hybrid ranking side by side.

> Demo GIF: _coming soon_

## What it shows

- **Hybrid retrieval.** Solr BM25 and CLIP kNN run in parallel and are merged with **Reciprocal Rank Fusion**. Every result shows which retriever found it and at what rank.
- **Cross-modal search.** One CLIP model embeds both text queries and product images into the same 512-d space, so "outfit for a beach wedding" finds products from their *pictures*, not their titles.
- **Search by image and "More like this".** Upload a photo, or pivot from any product to its visual neighbours.
- **Compare mode.** Lexical and hybrid results side by side, to see where keywords fail. For example, "black formal watch" returns formal *shoes* under BM25.
- **Observability.** Per-request timing breakdown (embed / BM25 / kNN) and rolling p50/p95 latency per mode.

## Architecture

```mermaid
flowchart LR
  UI[Next.js UI :3100] -->|/api, /images| API[NestJS API :4000]
  API -->|edismax BM25| SOLR[(Solr 9<br/>BM25 + HNSW vectors)]
  API -->|knn query| SOLR
  API -->|embed query| ML[CLIP service<br/>FastAPI :8001]
  API <-->|query embedding cache| REDIS[(Redis)]
  INGEST[Ingest pipeline] -->|image embeddings + docs| SOLR
  INGEST --> ML
```

| Component | Path | Stack |
| --- | --- | --- |
| Web UI | [apps/web](apps/web) | Next.js 15, React 19 |
| Search API | [services/api](services/api) | NestJS, ioredis |
| Embeddings + ingestion | [services/ml](services/ml) | Python, FastAPI, open_clip (ViT-B/32, LAION-2B) |
| Index | Docker | Apache Solr 9 (BM25 + `DenseVectorField` HNSW) |
| Cache | Docker | Redis 7 |

### How a hybrid query works

1. The API sends the query to Solr (edismax BM25 over name and attributes) and, **in parallel**, to the CLIP service. The CLIP call hits Redis first.
2. The CLIP text vector runs as a Solr `{!knn}` query against the product **image** vectors.
3. Each retriever returns 100 candidates. They are fused with RRF, `score = Σ 1 / (60 + rank)`. RRF uses only ranks, so BM25 scores and cosine similarities never need to be normalized onto the same scale.
4. Filters (gender, type, colour, usage) apply as Solr filter queries to *both* retrievers before ranking.

## Running locally

Prerequisites: Docker, Node 20+, pnpm, [uv](https://docs.astral.sh/uv/).

```bash
pnpm install
pnpm infra:up                  # Solr :8983, Redis :6380
pnpm ingest                    # downloads dataset + CLIP, embeds and indexes ~44k products
                               # (~8 min on Apple Silicon via MPS; try `--limit 2000` first)
pnpm embedder                  # CLIP service on :8001
pnpm api                       # API on :4000 (watch mode)
pnpm web                       # UI on http://localhost:3100
```

To pass flags to ingest: `cd services/ml && uv run findwise-ingest --limit 2000`.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/search?q=&mode=lexical\|vector\|hybrid&gender=&articleType=&baseColour=&usage=&limit=` | Text search |
| POST | `/api/search/image` (multipart `image`) | Search by image |
| GET | `/api/products/:id/similar` | Visual neighbours of a product |
| GET | `/api/facets` | Filter values with counts |
| GET | `/api/stats` | Rolling p50/p95 latency per mode |

## Results

**Server-side latency**, 44,072 products, single MacBook (Apple Silicon, 8 GB RAM), sequential requests, 20 distinct queries per text mode, 12 image queries:

| Mode | p50 | p95 | Notes |
| --- | --- | --- | --- |
| Lexical (BM25) | 8 ms | 22 ms | |
| Vector (CLIP kNN) | 30 ms | 54 ms | includes uncached query embedding on MPS |
| Hybrid (RRF) | 13 ms | 24 ms | BM25 and kNN in parallel; query embedding served from Redis cache |
| Image upload | 34 ms | 219 ms | includes image decode + CLIP image encoder |

**Sanity check:** searching with a catalog image returns that exact product at rank 1.

_Next: nDCG@10 for lexical vs vector vs hybrid on a labelled query set, and latency under concurrent load._

## Design decisions and trade-offs

- **Solr for both BM25 and vectors.** One engine, one set of filters, no consistency problems between two stores. The cost: Solr's kNN is HNSW-only and a little less ergonomic than a dedicated vector DB.
- **Fusion in the application, not in Solr.** It keeps the per-retriever ranks visible, which the UI uses to explain results, and lets the fusion strategy change without reindexing.
- **Over-fetching for kNN.** HNSW is approximate. With `topK=5`, recall was noticeably worse than with `topK=100` trimmed to 5, so kNN always searches at least 100 candidates.
- **Embedding images, not titles.** Titles in this catalog are short and formulaic, and the images carry the signal for style and occasion queries. Titles are covered by BM25.
- **Redis is optional.** Query embeddings are cached for 24 h. If Redis is down, search continues without the cache.
- **Native embedder in development.** The CLIP service runs outside Docker so it can use the Apple GPU (MPS), about 100 images/s versus CPU-only containers.

## Roadmap

- [ ] Offline evaluation: labelled queries, nDCG@10 / recall@50 per mode
- [ ] Cross-encoder or CLIP re-ranking stage on the fused top-50
- [ ] Dockerfiles for API, embedder and web, and a hosted demo
- [ ] Load test (k6) and publish p50/p95 under concurrency

## Dataset

[`ashraq/fashion-product-images-small`](https://huggingface.co/datasets/ashraq/fashion-product-images-small), derived from the Kaggle Fashion Product Images dataset.
