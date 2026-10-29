'use client';

import type { Hit, SearchResponse } from '@/lib/api';

export function TimingBar({ response }: { response: SearchResponse }) {
  const { embedMs, lexicalMs, vectorMs, totalMs } = response.timings;
  return (
    <div className="timings">
      <strong>{totalMs.toFixed(0)} ms</strong>
      {embedMs !== undefined && (
        <span>
          embed {embedMs.toFixed(0)} ms{response.embeddingCached ? ' (cached)' : ''}
        </span>
      )}
      {lexicalMs !== undefined && <span>BM25 {lexicalMs.toFixed(0)} ms</span>}
      {vectorMs !== undefined && <span>kNN {vectorMs.toFixed(0)} ms</span>}
      <span>{response.hits.length} results</span>
      {response.understanding && (
        <span className="detected" title="Keyword matches are limited to the product type named in the query">
          Detected: {response.understanding.productTypes.join(', ')}
        </span>
      )}
    </div>
  );
}

export function ResultGrid({
  hits,
  compact = false,
  onSimilar,
}: {
  hits: Hit[];
  compact?: boolean;
  onSimilar: (hit: Hit) => void;
}) {
  if (hits.length === 0) return <p className="empty">No products matched.</p>;
  return (
    <ol className={compact ? 'grid compact' : 'grid'}>
      {hits.map((hit, i) => (
        <li key={hit.id} className="card">
          <div className="card-image">
            <img src={hit.image} alt={hit.name} loading="lazy" />
            <span className="position">{i + 1}</span>
          </div>
          <div className="card-body">
            <p className="card-title">{hit.name}</p>
            <p className="card-meta">{[hit.baseColour, hit.articleType, hit.gender].filter(Boolean).join(' · ')}</p>
            <div className="badges">
              {hit.ranks.lexical && <span className="badge lexical">BM25 #{hit.ranks.lexical}</span>}
              {hit.ranks.vector && <span className="badge vector">Vector #{hit.ranks.vector}</span>}
            </div>
            <button className="link-button" onClick={() => onSimilar(hit)}>
              More like this →
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
