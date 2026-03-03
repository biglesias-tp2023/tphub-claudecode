/**
 * Multi-portal ID expansion utilities.
 *
 * Brands/restaurants may have multiple IDs across different delivery portals
 * (Glovo, UberEats, JustEat). These functions expand a selected ID to include
 * all related IDs for complete data querying.
 */

import type { Brand, Restaurant } from '@/types';

/**
 * Expand selected brand IDs to include all related IDs from multi-portal grouping.
 */
export function expandBrandIds(selectedIds: string[], brands: Brand[]): string[] {
  if (selectedIds.length === 0) return [];

  const expandedIds = new Set<string>();

  for (const selectedId of selectedIds) {
    const brand = brands.find(
      (b) => b.id === selectedId || b.allIds.includes(selectedId)
    );

    if (brand) {
      for (const id of brand.allIds) {
        expandedIds.add(id);
      }
    } else {
      expandedIds.add(selectedId);
    }
  }

  return Array.from(expandedIds);
}

/**
 * Expand selected restaurant IDs to include all related IDs from multi-portal grouping.
 */
export function expandRestaurantIds(selectedIds: string[], restaurants: Restaurant[]): string[] {
  if (selectedIds.length === 0) return [];

  const expandedIds = new Set<string>();

  for (const selectedId of selectedIds) {
    const restaurant = restaurants.find(
      (r) => r.id === selectedId || r.allIds.includes(selectedId)
    );

    if (restaurant) {
      for (const id of restaurant.allIds) {
        expandedIds.add(id);
      }
    } else {
      expandedIds.add(selectedId);
    }
  }

  return Array.from(expandedIds);
}
