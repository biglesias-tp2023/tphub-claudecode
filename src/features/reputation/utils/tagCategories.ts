/**
 * Tag category mapping for review tags.
 *
 * Maps normalized tag labels (from both Glovo and UberEats) to one of 5
 * thematic categories, each with its own color scheme.
 *
 * @module features/reputation/utils/tagCategories
 */

export type TagCategory = 'producto' | 'servicio' | 'packaging' | 'precio' | 'cantidad';

/**
 * Tailwind classes per category.
 */
const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  producto: 'bg-emerald-50 text-emerald-700',
  servicio: 'bg-primary-50 text-primary-700',
  packaging: 'bg-purple-50 text-purple-700',
  precio: 'bg-amber-50 text-amber-700',
  cantidad: 'bg-teal-50 text-teal-700',
};

const FALLBACK_CLASSES = 'bg-gray-100 text-gray-600';

/**
 * Exhaustive map of known tags → category.
 * Keys are **lowercase** for case-insensitive lookup.
 */
const TAG_CATEGORY_MAP: Record<string, TagCategory> = {
  // ── Producto ──────────────────────────────────────────────
  // Glovo (normalized from SCREAMING_SNAKE_CASE)
  'tasty': 'producto',
  'tasted bad': 'producto',
  'quality': 'producto',
  'not fresh': 'producto',
  'freshness': 'producto',
  // UberEats
  'not so tasty': 'producto',
  'perfectly cooked': 'producto',
  'high-quality ingredients': 'producto',
  'delicious options': 'producto',
  'perfectly seasoned': 'producto',
  'fresh ingredients': 'producto',
  'authentic dishes': 'producto',
  'unique flavours': 'producto',
  'creative menu': 'producto',
  'comfort food': 'producto',
  'healthy options': 'producto',
  'great for sharing': 'producto',
  'great for one': 'producto',
  'hidden gem': 'producto',
  'upmarket': 'producto',
  'consistent': 'producto',

  // ── Servicio ──────────────────────────────────────────────
  // Glovo
  'speed and reliability': 'servicio',
  'communication': 'servicio',
  'not followed order notes': 'servicio',
  'missing or mistaken items': 'servicio',
  // UberEats
  'too slow': 'servicio',
  'reliable service': 'servicio',
  'missed order notes': 'servicio',
  'convenient': 'servicio',
  'accommodating': 'servicio',

  // ── Packaging ─────────────────────────────────────────────
  // Glovo
  'packaging quality': 'packaging',
  // UberEats
  'sustainable packaging': 'packaging',
  'poorly packed': 'packaging',
  'unsustainable packaging': 'packaging',
  'nicely presented': 'packaging',

  // ── Precio ────────────────────────────────────────────────
  // Glovo
  'good value': 'precio',
  'expensive': 'precio',
  'not worth what it costs': 'precio',
  // UberEats
  'not worth the price': 'precio',

  // ── Cantidad ──────────────────────────────────────────────
  // Glovo
  'small portion size': 'cantidad',
  'portion size': 'cantidad',
  // UberEats
  'perfect portions': 'cantidad',
  'large portions': 'cantidad',
};

/**
 * Returns the category of a tag, or null if unknown.
 */
export function getTagCategory(tag: string): TagCategory | null {
  return TAG_CATEGORY_MAP[tag.toLowerCase()] ?? null;
}

/**
 * Returns the Tailwind classes for a tag badge.
 * Falls back to neutral gray for unrecognized tags.
 */
export function getTagClasses(tag: string): string {
  const category = getTagCategory(tag);
  return category ? TAG_CATEGORY_COLORS[category] : FALLBACK_CLASSES;
}
