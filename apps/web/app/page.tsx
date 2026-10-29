'use client';

import { useCallback, useEffect, useState } from 'react';
import { FilterBar } from '@/components/FilterBar';
import { LatencyPanel } from '@/components/LatencyPanel';
import { ResultGrid, TimingBar } from '@/components/Results';
import { SearchBar, UiMode } from '@/components/SearchBar';
import {
  Facets,
  Filters,
  getFacets,
  getStats,
  Hit,
  searchImage,
  searchText,
  SearchResponse,
  similar,
  Stats,
} from '@/lib/api';

const EXAMPLES = [
  'outfit for a beach wedding',
  'black formal watch',
  'something warm for winter',
  'red running shoes',
  'party wear for girls',
];

type View =
  | { kind: 'single'; title: string; response: SearchResponse; preview?: string }
  | { kind: 'compare'; title: string; lexical: SearchResponse; hybrid: SearchResponse };

export default function Home() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<UiMode>('hybrid');
  const [filters, setFilters] = useState<Filters>({});
  const [facets, setFacets] = useState<Facets | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    getFacets().then(setFacets).catch((e) => setError(e.message));
  }, []);

  const run = useCallback(async (task: () => Promise<View>) => {
    setLoading(true);
    setError(null);
    try {
      setView(await task());
      setStats(await getStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const runText = useCallback(
    (q: string, m: UiMode, f: Filters) => {
      if (!q.trim()) return;
      run(async () => {
        if (m === 'compare') {
          const [lexical, hybrid] = await Promise.all([searchText(q, 'lexical', f), searchText(q, 'hybrid', f)]);
          return { kind: 'compare', title: `“${q}”`, lexical, hybrid };
        }
        return { kind: 'single', title: `“${q}”`, response: await searchText(q, m, f) };
      });
    },
    [run],
  );

  const runImage = (file: File) =>
    run(async () => ({
      kind: 'single',
      title: 'Visually similar to your image',
      response: await searchImage(file, filters),
      preview: URL.createObjectURL(file),
    }));

  const runSimilar = (hit: Hit) =>
    run(async () => ({
      kind: 'single',
      title: `More like “${hit.name}”`,
      response: await similar(hit.id),
      preview: hit.image,
    }));

  const changeMode = (m: UiMode) => {
    setMode(m);
    runText(query, m, filters);
  };

  const changeFilters = (f: Filters) => {
    setFilters(f);
    runText(query, mode, f);
  };

  return (
    <main
      className={dragging ? 'page dragging' : 'page'}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) runImage(file);
      }}
    >
      <header className="header">
        <h1>Findwise</h1>
        <p>
          Product search over 44k items: BM25, CLIP vectors, and hybrid ranking with Reciprocal Rank Fusion. Search by
          text, or drop an image anywhere.
        </p>
      </header>

      <SearchBar
        query={query}
        mode={mode}
        onQueryChange={setQuery}
        onModeChange={changeMode}
        onSubmit={() => runText(query, mode, filters)}
        onImage={runImage}
      />

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="chip"
            onClick={() => {
              setQuery(ex);
              runText(ex, mode, filters);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      <FilterBar facets={facets} filters={filters} onChange={changeFilters} />

      <div className="layout">
        <section className="results" aria-busy={loading}>
          {error && <p className="error">{error}</p>}
          {loading && <p className="loading">Searching…</p>}
          {!loading && view?.kind === 'single' && (
            <>
              <div className="results-head">
                {view.preview && <img className="preview" src={view.preview} alt="" />}
                <h2>{view.title}</h2>
              </div>
              <TimingBar response={view.response} />
              <ResultGrid hits={view.response.hits} onSimilar={runSimilar} />
            </>
          )}
          {!loading && view?.kind === 'compare' && (
            <>
              <h2>{view.title}</h2>
              <div className="compare">
                <div>
                  <h3>Lexical (BM25)</h3>
                  <TimingBar response={view.lexical} />
                  <ResultGrid hits={view.lexical.hits} compact onSimilar={runSimilar} />
                </div>
                <div>
                  <h3>Hybrid (BM25 + CLIP, RRF)</h3>
                  <TimingBar response={view.hybrid} />
                  <ResultGrid hits={view.hybrid.hits} compact onSimilar={runSimilar} />
                </div>
              </div>
            </>
          )}
          {!loading && !view && !error && (
            <p className="empty">Pick an example above, type a query, or drop a product photo to start.</p>
          )}
        </section>
        <LatencyPanel stats={stats} />
      </div>
    </main>
  );
}
