import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Store } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useRestaurants, useRestaurantChannels } from '../../../hooks';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { CheckboxItem } from './CheckboxItem';

interface EstablishmentSelectorProps {
  className?: string;
}

export function EstablishmentSelector({ className }: EstablishmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: restaurants = [], isLoading } = useRestaurants();
  const { data: restaurantChannels } = useRestaurantChannels();
  const {
    restaurantIds,
    setRestaurantIds,
    toggleRestaurantId,
    clearRestaurants,
    channelIds
  } = useDashboardFiltersStore();

  // Filter restaurants by selected channels
  const filteredRestaurants = useMemo(() => {
    if (channelIds.length === 0 || !restaurantChannels) return restaurants;

    return restaurants.filter((restaurant) => {
      // Check all IDs for this restaurant (multi-portal dedup)
      return restaurant.allIds.some((id) => {
        const channels = restaurantChannels.get(id) || [];
        return channelIds.some((ch) => channels.includes(ch));
      });
    });
  }, [restaurants, restaurantChannels, channelIds]);

  // Auto-clear invalid selections when channel filter changes
  useEffect(() => {
    if (restaurantIds.length > 0 && channelIds.length > 0 && restaurantChannels) {
      const validIds = new Set(filteredRestaurants.map((r) => r.id));
      const newRestaurantIds = restaurantIds.filter((id) => validIds.has(id));
      if (newRestaurantIds.length !== restaurantIds.length) {
        setRestaurantIds(newRestaurantIds);
      }
    }
  }, [filteredRestaurants, restaurantIds, channelIds, restaurantChannels, setRestaurantIds]);

  // Sort restaurants alphabetically
  const sortedRestaurants = useMemo(() => {
    return [...filteredRestaurants].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [filteredRestaurants]);

  // Check if all are explicitly selected
  const allSelected = sortedRestaurants.length > 0 &&
    restaurantIds.length > 0 &&
    sortedRestaurants.every(r => restaurantIds.includes(r.id));

  // Check if some (but not all) are selected
  const someSelected = restaurantIds.length > 0 &&
    restaurantIds.length < sortedRestaurants.length;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle "Todos" checkbox
  const handleToggleAll = () => {
    if (allSelected) {
      clearRestaurants();
    } else {
      setRestaurantIds(sortedRestaurants.map(r => r.id));
    }
  };

  // Handle individual toggle
  const handleToggle = (id: string) => {
    toggleRestaurantId(id);
  };

  // Always allow opening — the dropdown panel shows empty/loading state
  const isDisabled = false;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border bg-white',
          'text-sm font-medium transition-all duration-150',
          isDisabled
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400',
          isOpen && !isDisabled && 'border-primary-500 ring-2 ring-primary-500/20'
        )}
      >
        <Store className="w-4 h-4 text-gray-500" />
        <span className={cn(
          isDisabled ? 'text-gray-400' : 'text-gray-900'
        )}>
          Establecimientos
        </span>
        {restaurantIds.length > 0 && !allSelected && (
          <span className="px-1.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
            {restaurantIds.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform ml-auto',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-50 mt-2 min-w-[320px] w-max max-w-[480px] bg-white rounded-xl border border-gray-200 shadow-xl',
            'animate-in fade-in zoom-in-95 duration-150'
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Seleccionar establecimientos
            </h3>
            {sortedRestaurants.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {restaurantIds.length} de {sortedRestaurants.length} seleccionados
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sortedRestaurants.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No hay establecimientos disponibles
              </div>
            ) : (
              <>
                {/* "Todos" checkbox */}
                <CheckboxItem
                  label="Todos"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleToggleAll}
                  className="border-b border-gray-100 pb-2 mb-2"
                />

                {/* Restaurants list with scroll */}
                <div className={cn(
                  'flex flex-col gap-1',
                  sortedRestaurants.length > 8 && 'max-h-64 overflow-y-auto overscroll-contain pr-1'
                )}>
                  {sortedRestaurants.map((restaurant) => (
                    <CheckboxItem
                      key={restaurant.id}
                      label={restaurant.name}
                      checked={restaurantIds.includes(restaurant.id)}
                      onChange={() => handleToggle(restaurant.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          {sortedRestaurants.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => setRestaurantIds(sortedRestaurants.map(r => r.id))}
                className="px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Seleccionar todos
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearRestaurants}
                  disabled={restaurantIds.length === 0}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-lg transition-colors',
                    restaurantIds.length > 0
                      ? 'text-error-600 hover:bg-error-50'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium',
                    'bg-gradient-to-b from-primary-500 to-primary-600 text-white',
                    'shadow-sm shadow-primary-600/25',
                    'hover:from-primary-600 hover:to-primary-700',
                    'transition-all duration-150'
                  )}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
