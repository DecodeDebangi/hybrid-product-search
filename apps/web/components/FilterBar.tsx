'use client';

import type { Facets, FilterKey, Filters } from '@/lib/api';

const LABELS: Record<FilterKey, string> = {
  gender: 'Gender',
  articleType: 'Type',
  baseColour: 'Colour',
  usage: 'Usage',
};

export function FilterBar({
  facets,
  filters,
  onChange,
}: {
  facets: Facets | null;
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  if (!facets) return null;
  return (
    <div className="filters">
      {(Object.keys(LABELS) as FilterKey[]).map((key) => (
        <label key={key} className="filter">
          <span>{LABELS[key]}</span>
          <select value={filters[key] ?? ''} onChange={(e) => onChange({ ...filters, [key]: e.target.value || undefined })}>
            <option value="">Any</option>
            {facets[key].map((b) => (
              <option key={b.value} value={b.value}>
                {b.value} ({b.count.toLocaleString()})
              </option>
            ))}
          </select>
        </label>
      ))}
      {Object.values(filters).some(Boolean) && (
        <button className="link-button" onClick={() => onChange({})}>
          Clear filters
        </button>
      )}
    </div>
  );
}
