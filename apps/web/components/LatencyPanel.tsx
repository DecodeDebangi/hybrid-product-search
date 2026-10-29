'use client';

import type { Stats } from '@/lib/api';

const ORDER = ['lexical', 'vector', 'hybrid', 'image', 'similar'];

export function LatencyPanel({ stats }: { stats: Stats | null }) {
  const modes = ORDER.filter((m) => stats?.[m]);
  if (!stats || modes.length === 0) return null;
  return (
    <aside className="latency">
      <h2>Server latency</h2>
      <table>
        <thead>
          <tr>
            <th>Mode</th>
            <th>p50</th>
            <th>p95</th>
            <th>n</th>
          </tr>
        </thead>
        <tbody>
          {modes.map((m) => (
            <tr key={m}>
              <td>{m}</td>
              <td>{stats[m].p50.toFixed(0)} ms</td>
              <td>{stats[m].p95.toFixed(0)} ms</td>
              <td>{stats[m].count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  );
}
