/**
 * Query understanding: find the product type a query names ("black formal watch" -> Watches),
 * so keyword search stops matching on the modifiers alone ("black formal" -> formal shoes).
 * The vocabulary comes from the catalog's own article types.
 */

// Type words that are too generic or double as everyday words ("long sleeve", "lace top", "gift set").
const AMBIGUOUS_HEADS = new Set([
  'accessory', 'set', 'care', 'cover', 'cream', 'gift', 'essential', 'colour', 'mist', 'gel', 'kit',
  'sleeve', 'lace', 'suit', 'trunk', 'peel', 'scrub', 'remover', 'plumper', 'primer', 'cleanser',
  'exfoliator', 'doll', 'liner', 'chain', 'pant', 'booty',
]);

// Singular forms that are usually adjectives; only the plural ("shorts", "flats") names the product.
const PLURAL_ONLY = new Set(['short', 'flat', 'tight', 'compact']);

const IRREGULAR: Record<string, string> = { scarves: 'scarf', ties: 'tie' };

// Catalog categories that don't name something a shopper buys: body parts ("out of my eyes") or catch-alls.
const NON_PRODUCT_CATEGORIES = new Set([
  'Eyes', 'Lips', 'Nails', 'Skin', 'Skin Care', 'Hair', 'Bath and Body', 'Accessories', 'Free Gifts',
  'Apparel Set', 'Vouchers', 'Home Furnishing', 'Beauty Accessories', 'Sports Accessories', 'Shoe Accessories',
]);

export interface ProductTypeIndex {
  phrases: Map<string, string[]>;
  words: Map<string, string[]>;
}

export function singular(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (/(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\bt[\s-]?shirts?\b/g, (m) => (m.endsWith('s') ? 'tshirts' : 'tshirt'))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export interface CatalogType {
  type: string;
  /** Catalog sub-category, e.g. Heels -> Shoes. A category word ("shoes", "bags") means all of its types. */
  category?: string;
}

export function buildProductTypeIndex(catalog: CatalogType[]): ProductTypeIndex {
  const phrases = new Map<string, string[]>();
  const words = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, key: string, type: string) => {
    const list = map.get(key) ?? [];
    if (!list.includes(type)) map.set(key, [...list, type]);
  };

  for (const { type } of catalog) {
    const tokens = tokenize(type);
    const last = tokens[tokens.length - 1];
    const head = singular(last);
    if (tokens.length > 1) {
      add(phrases, tokens.join(' '), type);
      add(phrases, [...tokens.slice(0, -1), head].join(' '), type);
    }
    if (AMBIGUOUS_HEADS.has(head)) continue;
    add(words, last, type);
    if (!PLURAL_ONLY.has(head)) add(words, head, type);
  }

  for (const { type, category } of catalog) {
    if (!category || NON_PRODUCT_CATEGORIES.has(category)) continue;
    // "Loungewear and Nightwear" -> "loungewear", "nightwear"
    for (const word of tokenize(category).filter((w) => w !== 'and')) {
      if (AMBIGUOUS_HEADS.has(singular(word))) continue;
      add(words, word, type);
      add(words, singular(word), type);
    }
  }
  return { phrases, words };
}

/** Article types named in the query; empty when it names none. Multi-word type names win over single words. */
export function detectProductTypes(query: string, index: ProductTypeIndex): string[] {
  const tokens = tokenize(query);
  const found = new Set<string>();
  const covered = new Set<number>();

  for (let size = 3; size >= 2; size--) {
    for (let i = 0; i + size <= tokens.length; i++) {
      const types = index.phrases.get(tokens.slice(i, i + size).join(' '));
      if (!types) continue;
      types.forEach((t) => found.add(t));
      for (let j = i; j < i + size; j++) covered.add(j);
    }
  }
  tokens.forEach((token, i) => {
    if (!covered.has(i)) index.words.get(token)?.forEach((t) => found.add(t));
  });
  return [...found];
}
