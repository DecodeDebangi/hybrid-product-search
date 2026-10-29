import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Product } from './types';
import { verifyLexical } from './verify';

const product = (id: string, similarity?: number): Product => ({ id, name: id, image: '', similarity });

test('drops keyword matches that look less like the query than every vector candidate', () => {
  const vector = [product('jeans-1', 0.65), product('jeans-2', 0.62)];
  const lexical = [product('denim-deo', 0.59), product('denim-jeans', 0.63)];
  const { kept, dropped } = verifyLexical(lexical, vector);
  assert.deepEqual(kept.map((p) => p.id), ['denim-jeans']);
  assert.equal(dropped, 1);
});

test('keeps keyword results untouched when there are no vector candidates to compare against', () => {
  const lexical = [product('a', 0.1)];
  assert.deepEqual(verifyLexical(lexical, []), { kept: lexical, dropped: 0 });
});
