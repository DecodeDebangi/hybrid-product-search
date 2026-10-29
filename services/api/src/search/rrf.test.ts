import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reciprocalRankFusion } from './rrf';

test('documents found by both retrievers outrank single-source hits', () => {
  const fused = reciprocalRankFusion([
    { source: 'lexical', ids: ['a', 'b', 'c'] },
    { source: 'vector', ids: ['c', 'd', 'a'] },
  ]);
  assert.deepEqual(fused.slice(0, 2).map((f) => f.id), ['a', 'c']);
  assert.deepEqual(fused[0].ranks, { lexical: 1, vector: 3 });
});

test('a single list keeps its original order', () => {
  const fused = reciprocalRankFusion([{ source: 'vector', ids: ['x', 'y', 'z'] }]);
  assert.deepEqual(fused.map((f) => f.id), ['x', 'y', 'z']);
});
