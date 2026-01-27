import { useMemo } from 'react';
import { useAreas } from '../../hooks';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { FilterDropdown } from './FilterDropdown';

interface AreaSelectorProps {
  className?: string;
}

export function AreaSelector({ className }: AreaSelectorProps) {
  const { data: areas = [], isLoading } = useAreas();
  const { areaIds, toggleAreaId, clearAreas, setAreaIds, brandIds } = useDashboardFiltersStore();

  const options = useMemo(() => {
    return areas
      .map((area) => ({
        id: area.id,
        name: area.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [areas]);

  // Disable if no brands are selected
  const isDisabled = brandIds.length === 0 && areas.length === 0 && !isLoading;

  return (
    <FilterDropdown
      label="Área"
      options={options}
      selectedIds={areaIds}
      onToggle={toggleAreaId}
      onClear={clearAreas}
      onSelectAll={setAreaIds}
      placeholder="Todas"
      isLoading={isLoading}
      disabled={isDisabled}
      className={className}
      treatEmptyAsAll={true}
    />
  );
}
