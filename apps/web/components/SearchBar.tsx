'use client';

import { useRef } from 'react';
import type { Mode } from '@/lib/api';

export type UiMode = Mode | 'compare';

const MODES: { value: UiMode; label: string; hint: string }[] = [
  { value: 'lexical', label: 'Lexical', hint: 'BM25 keyword match' },
  { value: 'vector', label: 'Semantic', hint: 'CLIP text → image vectors' },
  { value: 'hybrid', label: 'Hybrid', hint: 'Reciprocal Rank Fusion of both' },
  { value: 'compare', label: 'Compare', hint: 'Lexical vs hybrid, side by side' },
];

interface Props {
  query: string;
  mode: UiMode;
  onQueryChange: (q: string) => void;
  onModeChange: (mode: UiMode) => void;
  onSubmit: () => void;
  onImage: (file: File) => void;
}

export function SearchBar({ query, mode, onQueryChange, onModeChange, onSubmit, onImage }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="search">
      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          className="search-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Try “outfit for a beach wedding” or “black formal watch”"
          aria-label="Search products"
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => fileInput.current?.click()}
          title="Search by image"
          aria-label="Search by image"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
            />
          </svg>
        </button>
        <button type="submit" className="primary-button">
          Search
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImage(file);
            e.target.value = '';
          }}
        />
      </form>
      <div className="modes" role="radiogroup" aria-label="Ranking mode">
        {MODES.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={mode === m.value}
            className={mode === m.value ? 'mode active' : 'mode'}
            onClick={() => onModeChange(m.value)}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
        <span className="mode-hint">{MODES.find((m) => m.value === mode)?.hint}</span>
      </div>
    </div>
  );
}
