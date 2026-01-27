import { useMemo } from 'react';
import { useBrands } from '../../hooks';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { FilterDropdown } from './FilterDropdown';

interface BrandSelectorProps {
  className?: string;
}

export function BrandSelector({ className }: BrandSelectorProps) {
  const { data: brands = [], isLoading } = useBrands();
  const { brandIds, toggleBrandId, clearBrands, setBrandIds } = useDashboardFiltersStore();

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
      onSelectAll={setBrandIds}
      placeholder="Todas"
      isLoading={isLoading}
      disabled={brands.length === 0 && !isLoading}
      className={className}
      treatEmptyAsAll={true}
    />
  );
}
