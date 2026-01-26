import { useMemo } from 'react';
import { useRestaurants } from '../../hooks';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { FilterDropdown } from './FilterDropdown';

interface RestaurantSelectorProps {
  className?: string;
}

export function RestaurantSelector({ className }: RestaurantSelectorProps) {
  const { data: restaurants = [], isLoading } = useRestaurants();
  const { restaurantIds, toggleRestaurantId, clearRestaurants, brandIds, areaIds } = useDashboardFiltersStore();

  const options = useMemo(() => {
    return restaurants
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [restaurants]);

  // Disable if no brands or areas are selected
  const isDisabled = (brandIds.length === 0 && areaIds.length === 0) && restaurants.length === 0 && !isLoading;

  return (
    <FilterDropdown
      label="Restaurante"
      options={options}
      selectedIds={restaurantIds}
      onToggle={toggleRestaurantId}
      onClear={clearRestaurants}
      placeholder="Todos"
      isLoading={isLoading}
      disabled={isDisabled}
      className={className}
    />
  );
}
