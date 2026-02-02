import { Check, Calendar, Tag, Settings, Package } from 'lucide-react';
import { PLATFORMS, getCampaignTypeConfig } from '../../config/platforms';
import { PlatformLogo } from './PlatformSelector';
import type { CampaignPlatform, CampaignConfig } from '@/types';

interface ReviewStepProps {
  platform: CampaignPlatform;
  campaignType: string;
  campaignName: string;
  config: CampaignConfig;
  productIds: string[];
  startDate: string;
  endDate: string;
}

export function ReviewStep({
  platform,
  campaignType,
  campaignName,
  config,
  productIds,
  startDate,
  endDate,
}: ReviewStepProps) {
  const platformConfig = PLATFORMS[platform];
  const typeConfig = getCampaignTypeConfig(platform, campaignType);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Resumen de la campaña</h3>
        <p className="text-sm text-gray-500">
          Revisa los detalles antes de crear la campaña.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header with platform color */}
        <div
          className="px-6 py-4 text-white"
          style={{ backgroundColor: platformConfig.color }}
        >
          <div className="flex items-center gap-3">
            <PlatformLogo platform={platform} className="w-10 h-10" />
            <div>
              <h4 className="font-semibold">{campaignName || typeConfig?.label || campaignType}</h4>
              <p className="text-sm opacity-90">{platformConfig.name}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-gray-100">
          {/* Campaign type */}
          <div className="px-6 py-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tipo de campaña</p>
              <p className="font-medium text-gray-900">{typeConfig?.label || campaignType}</p>
              {typeConfig?.description && (
                <p className="text-sm text-gray-500 mt-0.5">{typeConfig.description}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="px-6 py-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Periodo</p>
              <p className="font-medium text-gray-900">
                {formatDate(startDate)}
              </p>
              {startDate !== endDate && (
                <>
                  <p className="text-sm text-gray-500">hasta</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(endDate)}
                  </p>
                </>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {calculateDays()} dia{calculateDays() > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Configuration */}
          {Object.keys(config).length > 0 && (
            <div className="px-6 py-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Configuracion</p>
                <div className="mt-2 space-y-1">
                  {Object.entries(config).map(([key, value]) => {
                    if (value === undefined || value === null) return null;
                    const field = typeConfig?.fields.find(f => f.key === key);
                    const label = field?.label || key;
                    let displayValue = value;

                    if (Array.isArray(value)) {
                      displayValue = value.join(', ');
                    } else if (field?.type === 'percent') {
                      displayValue = `${value}%`;
                    } else if (field?.type === 'currency') {
                      displayValue = `${value} EUR`;
                    } else if (field?.suffix) {
                      displayValue = `${value} ${field.suffix}`;
                    }

                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600">{label}:</span>
                        <span className="font-medium text-gray-900">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          {productIds.length > 0 && (
            <div className="px-6 py-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Productos seleccionados</p>
                <p className="font-medium text-gray-900">
                  {productIds.length} producto{productIds.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation message */}
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">
            Todo listo para crear la campaña
          </p>
          <p className="text-sm text-green-700 mt-0.5">
            La campaña se activara automaticamente en la fecha de inicio.
          </p>
        </div>
      </div>
    </div>
  );
}
