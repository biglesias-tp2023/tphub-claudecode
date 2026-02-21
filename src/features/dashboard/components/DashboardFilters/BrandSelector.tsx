import { useMemo, useEffect } from 'react';
import { useBrands, useBrandChannels } from '../../hooks';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { FilterDropdown } from './FilterDropdown';

interface BrandSelectorProps {
  className?: string;
}

export function BrandSelector({ className }: BrandSelectorProps) {
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: brandChannels } = useBrandChannels();
  const { brandIds, toggleBrandId, clearBrands, setBrandIds, channelIds } = useDashboardFiltersStore();

  // Filter brands by selected channels
  const filteredBrands = useMemo(() => {
    if (channelIds.length === 0 || !brandChannels) return brands;

    return brands.filter((brand) => {
      // Check all IDs for this brand (multi-portal dedup)
      return brand.allIds.some((id) => {
        const channels = brandChannels.get(id) || [];
        return channelIds.some((ch) => channels.includes(ch));
      });
    });
  }, [brands, brandChannels, channelIds]);

  // Auto-clear invalid selections when channel filter changes
  useEffect(() => {
    if (brandIds.length > 0 && channelIds.length > 0 && brandChannels) {
      const validIds = new Set(filteredBrands.map((b) => b.id));
      const newBrandIds = brandIds.filter((id) => validIds.has(id));
      if (newBrandIds.length !== brandIds.length) {
        setBrandIds(newBrandIds);
      }
    }
  }, [filteredBrands, brandIds, channelIds, brandChannels, setBrandIds]);

  const options = useMemo(() => {
    return filteredBrands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [filteredBrands]);

  return (
    <FilterDropdown
      label="Marca"
      options={options}
      selectedIds={brandIds}
      onToggle={toggleBrandId}
      onClear={clearBrands}
      onSelectAll={setBrandIds}
      placeholder="Todas"
      isLoading={brandsLoading}
      disabled={filteredBrands.length === 0 && !brandsLoading}
      className={className}
      treatEmptyAsAll={false}
      showHeader={true}
      headerTitle="Seleccionar marcas"
    />
  );
}
