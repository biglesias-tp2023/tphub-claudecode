import { useMemo } from 'react';
import { useBrands } from '../../hooks';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { FilterDropdown } from './FilterDropdown';

interface BrandSelectorProps {
  className?: string;
}

export function BrandSelector({ className }: BrandSelectorProps) {
  const { data: brands = [], isLoading } = useBrands();
  const { brandIds, toggleBrandId, clearBrands } = useDashboardFiltersStore();

  const options = useMemo(() => {
    return brands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [brands]);

  return (
    <FilterDropdown
      label="Marca"
      options={options}
      selectedIds={brandIds}
      onToggle={toggleBrandId}
      onClear={clearBrands}
      placeholder="Todas"
      isLoading={isLoading}
      disabled={brands.length === 0 && !isLoading}
      className={className}
    />
  );
}
