import { MapPin } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';
import { EventsWidget } from './EventsWidget';
import { ProductsWidget } from './ProductsWidget';
import type { Restaurant, WeatherForecast, CalendarEvent, ProductWithTier } from '@/types';

interface SidePanelProps {
  restaurant: Restaurant | null;
  weatherForecasts: WeatherForecast[];
  weatherLoading?: boolean;
  weatherError?: string;
  calendarEvents: CalendarEvent[];
  eventsLoading?: boolean;
  products: ProductWithTier[];
  productsLoading?: boolean;
  onProductClick?: (product: ProductWithTier) => void;
}

export function SidePanel({
  restaurant,
  weatherForecasts,
  weatherLoading,
  weatherError,
  calendarEvents,
  eventsLoading,
  products,
  productsLoading,
  onProductClick,
}: SidePanelProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Restaurant header */}
      <div className="p-4 border-b border-gray-200">
        {restaurant ? (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{restaurant.name}</h3>
              {restaurant.address && (
                <p className="text-sm text-gray-500 truncate">{restaurant.address}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-sm">Selecciona un restaurante</p>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Weather widget */}
        <div className="border-b border-gray-100">
          <WeatherWidget
            forecasts={weatherForecasts}
            isLoading={weatherLoading}
            error={weatherError}
          />
        </div>

        {/* Events widget */}
        <div className="border-b border-gray-100">
          <EventsWidget events={calendarEvents} isLoading={eventsLoading} />
        </div>

        {/* Products widget */}
        <ProductsWidget
          products={products}
          isLoading={productsLoading}
          onProductClick={onProductClick}
        />
      </div>
    </div>
  );
}
