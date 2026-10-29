import { Injectable } from '@nestjs/common';

const WINDOW = 500;

export interface LatencyStats {
  count: number;
  p50: number;
  p95: number;
}

/** Rolling latency window per search mode, exposed on the UI as p50/p95. */
@Injectable()
export class MetricsService {
  private readonly samples = new Map<string, number[]>();

  record(mode: string, ms: number) {
    const list = this.samples.get(mode) ?? [];
    list.push(ms);
    if (list.length > WINDOW) list.shift();
    this.samples.set(mode, list);
  }

  snapshot(): Record<string, LatencyStats> {
    return Object.fromEntries(
      [...this.samples].map(([mode, list]) => {
        const sorted = [...list].sort((a, b) => a - b);
        return [mode, { count: sorted.length, p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95) }];
      }),
    );
  }
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? 0;
}
