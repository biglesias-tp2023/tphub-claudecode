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
                    // Skip internal/schedule sub-fields (shown with parent)
                    if (['scheduleDays', 'scheduleStartTime', 'scheduleEndTime', 'timeSlotStart', 'timeSlotEnd', 'jeCustomDays', 'jeHoursStart', 'jeHoursEnd'].includes(key)) return null;
                    // Skip custom input companion fields
                    if (key.endsWith('_custom')) return null;
                    // Skip info_text fields
                    const field = typeConfig?.fields.find(f => f.key === key);
                    if (field?.type === 'info_text') return null;
                    // Skip fields whose dependency isn't met
                    if (field?.dependsOn && field?.showWhen) {
                      const siblingValue = config[field.dependsOn as keyof CampaignConfig];
                      if (siblingValue !== field.showWhen) return null;
                    }

                    const label = field?.label || key;
                    let displayValue: string;

                    if (key === 'audience' || key === 'adAudience') {
                      const opt = field?.options?.find(o => o.value === value);
                      displayValue = opt?.label || String(value);
                    } else if (key === 'acquisitionTarget') {
                      displayValue = `${value} pedidos`;
                    } else if (key === 'primeBoost') {
                      displayValue = value === false ? 'Desactivado' : `+${value}% extra Prime`;
                    } else if (key === 'weekDays' && Array.isArray(value)) {
                      const dayLabels: Record<string, string> = { mon: 'L', tue: 'M', wed: 'X', thu: 'J', fri: 'V', sat: 'S', sun: 'D' };
                      displayValue = (value as string[]).length === 7
                        ? 'Todos los dias'
                        : (value as string[]).map(d => dayLabels[d] || d).join(', ');
                    } else if (key === 'timeSlot') {
                      const slotLabels: Record<string, string> = { all_day: 'Todo el dia', breakfast: 'Desayuno', lunch: 'Comida', snack: 'Merienda', dinner: 'Cena', custom: 'Personalizado' };
                      displayValue = slotLabels[value as string] || String(value);
                      if (value === 'custom' && config.timeSlotStart && config.timeSlotEnd) {
                        displayValue += ` (${config.timeSlotStart}–${config.timeSlotEnd})`;
                      }
                    } else if (key === 'duration') {
                      displayValue = value === 'permanent' ? 'Permanente' : 'Temporal';
                    } else if (key === 'deliveryDiscount') {
                      displayValue = value === 'free' ? 'Envio gratis' : 'Descuento fijo';
                    } else if (key === 'budgetLimit') {
                      displayValue = value === null ? 'Sin limite' : `${value} €`;
                    } else if (key === 'totalBudget') {
                      displayValue = value === null ? 'Sin limite' : `${value} €`;
                    } else if (key === 'cpcBid') {
                      if (value === 'auto') {
                        displayValue = 'Automatica';
                      } else if (value === 'custom') {
                        const customVal = config[`${key}_custom` as keyof CampaignConfig];
                        displayValue = customVal ? `${customVal} €/clic` : 'Personalizado';
                      } else {
                        displayValue = String(value);
                      }
                    } else if (key === 'adFormat') {
                      const formatLabels: Record<string, string> = {
                        sponsored_search: 'Busqueda Patrocinada', home_banner: 'Home / Banner',
                        premium_category: 'Ubicacion Premium', in_order: 'Pedido en Curso',
                      };
                      displayValue = formatLabels[value as string] || String(value);
                    } else if (key === 'discountType') {
                      displayValue = value === 'percentage' ? 'Porcentaje' : 'Cantidad fija';
                    // Just Eat-specific fields
                    } else if (key === 'triggerType') {
                      displayValue = value === 'buy_item' ? 'Al comprar otro articulo' : 'Al gastar un importe minimo';
                    } else if (key === 'bogoType') {
                      const bogoLabels: Record<string, string> = {
                        free: '2o gratis', '50_off': '2o al 50%', '25_off': '2o al 25%',
                      };
                      displayValue = bogoLabels[value as string] || String(value);
                    } else if (key === 'jeScheduleDays') {
                      const schedLabels: Record<string, string> = {
                        every_day: 'Todos los dias', weekdays: 'Entre semana (L-V)',
                        weekends: 'Fines de semana (S-D)', custom: 'Dias especificos',
                      };
                      displayValue = schedLabels[value as string] || String(value);
                      if (value === 'custom' && config.jeCustomDays && Array.isArray(config.jeCustomDays)) {
                        const dayLabelsJE: Record<string, string> = { mon: 'L', tue: 'M', wed: 'X', thu: 'J', fri: 'V', sat: 'S', sun: 'D' };
                        displayValue += ` (${(config.jeCustomDays as string[]).map(d => dayLabelsJE[d] || d).join(', ')})`;
                      }
                    } else if (key === 'jeScheduleHours') {
                      displayValue = value === 'all_hours' ? 'Todo el horario' : 'Horas seleccionadas';
                      if (value === 'selected_hours' && config.jeHoursStart && config.jeHoursEnd) {
                        displayValue += ` (${config.jeHoursStart}–${config.jeHoursEnd})`;
                      }
                    } else if (key === 'startWhen') {
                      displayValue = value === 'now' ? 'Ahora' : 'Fecha programada';
                    } else if (key === 'endWhen') {
                      displayValue = value === 'manual' ? 'Manualmente' : 'Despues de X semanas';
                    } else if (key === 'durationWeeks') {
                      displayValue = `${value} semanas`;
                    } else if (key === 'maxRedemptions') {
                      displayValue = value === 'unlimited' ? 'Sin limite' : 'Limitado';
                    } else if (key === 'maxRedemptionsCount') {
                      displayValue = `${value} usos`;
                    } else if (key === 'stampCardEnabled') {
                      displayValue = value === 'active' ? 'Activado' : 'Desactivado';
                    } else if (key === 'deliveryArea') {
                      displayValue = value === 'all_zones' ? 'Todas las zonas' : 'Zonas seleccionadas';
                    } else if (key === 'weeklyBudget') {
                      displayValue = `${value} €/semana`;
                    // Cheerfy-specific fields
                    } else if (key === 'communicationType') {
                      displayValue = value === 'email' ? 'Email' : 'SMS';
                    } else if (key === 'isAutomationActive') {
                      displayValue = value === 'true' || value === true ? 'Activo' : 'Pausado';
                    } else if (key === 'triggerCondition') {
                      const triggerLabels: Record<string, string> = {
                        on_arrival: 'Al llegar', on_transaction: 'Al comprar',
                        on_departure: 'Al irse', on_birthday: 'Cumpleanos',
                      };
                      displayValue = triggerLabels[value as string] || String(value);
                    } else if (key === 'minSpend') {
                      displayValue = `${value} €`;
                    } else if (key === 'durationPreset') {
                      const presetLabels: Record<string, string> = {
                        '1_año': '1 ano', '6_meses': '6 meses', '30_dias': '30 dias',
                        '45_dias': '45 dias', 'en_curso': 'En curso', 'personalizar': 'Personalizado',
                      };
                      displayValue = presetLabels[value as string] || String(value);
                      // Append schedule info if present
                      if (config.scheduleStartTime && config.scheduleEndTime) {
                        displayValue += ` (${config.scheduleStartTime}–${config.scheduleEndTime})`;
                      }
                      if (config.scheduleDays && Array.isArray(config.scheduleDays) && config.scheduleDays.length < 7) {
                        displayValue += ` — ${(config.scheduleDays as string[]).join(', ')}`;
                      }
                    } else if (key === 'weeklySpendLimit') {
                      displayValue = value === null ? 'Sin limite' : `${value} €/semana`;
                    } else if (key === 'dynamicSavings') {
                      displayValue = value ? 'Activado' : 'Desactivado';
                    } else if (key === 'flatOffPair' && typeof value === 'object' && value !== null) {
                      const pair = value as { spend: number; save: number };
                      displayValue = `Gasta ${pair.spend} €, ahorra ${pair.save} €`;
                    } else if (key === 'adBidMode') {
                      displayValue = value === 'automatico' ? 'Automatico' : 'Personalizado';
                    } else if (Array.isArray(value)) {
                      displayValue = value.join(', ');
                    } else if (field?.type === 'percent' || field?.type === 'percent_radio') {
                      displayValue = `${value}%`;
                    } else if (field?.type === 'currency' || field?.type === 'currency_radio' || field?.type === 'ad_budget') {
                      displayValue = `${value} €`;
                    } else if (field?.suffix) {
                      displayValue = `${value} ${field.suffix}`;
                    } else if (typeof value === 'boolean') {
                      displayValue = value ? 'Si' : 'No';
                    } else {
                      displayValue = String(value);
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
