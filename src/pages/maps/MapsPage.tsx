import { Map, AlertCircle } from 'lucide-react';
import { DashboardFilters } from '@/features/dashboard';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { getPresetLabel } from '@/utils/formatters';
import { Spinner } from '@/components/ui/Spinner';
import {
  MapView,
  MapControlPanel,
  useMapData,
  useMapFilters,
  useMapBounds,
} from '@/features/maps';

/**
 * Maps page - Geographic visualization of delivery points with heatmap
 */
export function MapsPage() {
  const { companyIds } = useGlobalFiltersStore();
  const { datePreset } = useDashboardFiltersStore();

  // Map data hook
  const { restaurants, deliveryPoints, isLoading, error } = useMapData();

  // Map control state
  const {
    showHeatmap,
    showRestaurants,
    showDeliveryRadius,
    showDeliveryPoints,
    selectedMetric,
    selectedRestaurantId,
    toggleHeatmap,
    toggleRestaurants,
    toggleDeliveryRadius,
    toggleDeliveryPoints,
    setSelectedMetric,
    setSelectedRestaurantId,
  } = useMapFilters();

  // Calculate map bounds based on visible restaurants
  const bounds = useMapBounds(restaurants);

  // Header text
  const companyText =
    companyIds.length === 0
      ? 'Todos los negocios'
      : companyIds.length === 1
        ? 'Compania seleccionada'
        : `${companyIds.length} companias`;

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-primary-600" />
            Mapas
          </h1>
          <p className="text-gray-500 mt-1">
            {companyText} &bull; {getPresetLabel(datePreset)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0">
        <DashboardFilters />
      </div>

      {/* Map section */}
      <div className="flex-1 flex gap-4 min-h-[500px]">
        {/* Control Panel */}
        <MapControlPanel
          restaurantCount={restaurants.length}
          deliveryPointCount={deliveryPoints.length}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          showHeatmap={showHeatmap}
          onToggleHeatmap={toggleHeatmap}
          showRestaurants={showRestaurants}
          onToggleRestaurants={toggleRestaurants}
          showDeliveryRadius={showDeliveryRadius}
          onToggleDeliveryRadius={toggleDeliveryRadius}
          showDeliveryPoints={showDeliveryPoints}
          onToggleDeliveryPoints={toggleDeliveryPoints}
        />

        {/* Map Area */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-2 text-sm text-gray-500">Cargando mapa...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center text-red-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">Error al cargar el mapa</p>
                <p className="text-sm text-gray-500 mt-1">
                  Por favor, intenta de nuevo mas tarde.
                </p>
              </div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <Map className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-900">
                  No hay establecimientos
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Ajusta los filtros para ver establecimientos en el mapa.
                </p>
              </div>
            </div>
          ) : (
            <MapView
              restaurants={restaurants}
              deliveryPoints={deliveryPoints}
              bounds={bounds}
              selectedMetric={selectedMetric}
              showHeatmap={showHeatmap}
              showRestaurants={showRestaurants}
              showDeliveryRadius={showDeliveryRadius}
              showDeliveryPoints={showDeliveryPoints}
              selectedRestaurantId={selectedRestaurantId}
              onRestaurantSelect={setSelectedRestaurantId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
