import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildProductTypeIndex, detectProductTypes, singular } from './product-types';

const index = buildProductTypeIndex([
  ...['Watches', 'Flip Flops', 'Shorts', 'Lounge Shorts', 'Tshirts', 'Ties', 'Scarves', 'Tablet Sleeve',
    'Shoe Laces', 'Track Pants', 'Dresses', 'Tops'].map((type) => ({ type })),
  ...['Formal Shoes', 'Casual Shoes', 'Sports Shoes', 'Heels'].map((type) => ({ type, category: 'Shoes' })),
  ...['Laptop Bag', 'Handbags'].map((type) => ({ type, category: 'Bags' })),
  { type: 'Kajal and Eyeliner', category: 'Eyes' },
]);
const detect = (q: string) => detectProductTypes(q, index).sort();

test('finds the product type among modifiers', () => {
  assert.deepEqual(detect('black formal watch'), ['Watches']);
  assert.deepEqual(detect('light summer dress'), ['Dresses']);
});

test('multi-word type names are more specific than their head word', () => {
  assert.deepEqual(detect('men formal shoes'), ['Formal Shoes']);
  assert.deepEqual(detect('shoes for a party'), ['Casual Shoes', 'Formal Shoes', 'Heels', 'Sports Shoes']);
  assert.deepEqual(detect('black laptop bag'), ['Laptop Bag']);
});

test('ignores ambiguous words and adjectives', () => {
  assert.deepEqual(detect('long sleeve top'), ['Tops']);
  assert.deepEqual(detect('lace dress'), ['Dresses']);
  assert.deepEqual(detect('short dress'), ['Dresses']);
  assert.deepEqual(detect('formal pants'), []);
  assert.deepEqual(detect('something warm for winter'), []);
});

test('plurals, irregulars and t-shirt spellings', () => {
  assert.deepEqual(detect('denim shorts'), ['Lounge Shorts', 'Shorts']);
  assert.deepEqual(detect('silk tie'), ['Ties']);
  assert.deepEqual(detect('wool scarf'), ['Scarves']);
  assert.deepEqual(detect('white t-shirt'), ['Tshirts']);
  assert.equal(singular('watches'), 'watch');
});

test('a category word means every type in that category', () => {
  assert.deepEqual(detect('black bag'), ['Handbags', 'Laptop Bag']);
  assert.deepEqual(detect('keep the sun out of my eyes'), []);
});
