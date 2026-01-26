/**
 * FieldRenderer - Renderiza el campo apropiado según el tipo de objetivo
 *
 * Este componente actúa como un "switch" que selecciona y renderiza
 * el componente de campo correcto basándose en la configuración del objetivo.
 */
import { GridChannelMonth } from './GridChannelMonth';
import { PercentageRange } from './PercentageRange';
import { PercentageOrAmount } from './PercentageOrAmount';
import { MinutesInput } from './MinutesInput';
import { NumberTarget } from './NumberTarget';
import { RatingByChannel } from './RatingByChannel';
import { EmailAction } from './EmailAction';
import { EmailWithDropdown } from './EmailWithDropdown';
import { FreeText } from './FreeText';
import { DeadlineOnly } from './DeadlineOnly';
import type {
  ObjectiveTypeConfig,
  ObjectiveFieldData,
  GridChannelMonthData,
  PercentageRangeData,
  RatingByChannelData,
  EmailActionData,
  InvestmentConfig,
} from '@/types';

// ============================================
// TYPES
// ============================================

interface FieldRendererProps {
  config: ObjectiveTypeConfig;
  fieldData: ObjectiveFieldData;
  onChange: (fieldData: ObjectiveFieldData) => void;
}

// ============================================
// HELPERS
// ============================================

function getEmptyGridData(): GridChannelMonthData {
  return {};
}

function getEmptyInvestmentConfig(): InvestmentConfig {
  return { glovo: 0, ubereats: 0, justeat: 0 };
}

function getEmptyPercentageRange(): PercentageRangeData {
  return { currentValue: 0, targetValue: 0 };
}

function getEmptyRatingByChannel(): RatingByChannelData {
  return {
    glovo: { current: 0, target: 0 },
    ubereats: { current: 0, target: 0 },
    justeat: { current: 0, target: 0 },
  };
}

function getEmptyEmailAction(): EmailActionData {
  return { email: '' };
}

// ============================================
// COMPONENT
// ============================================

export function FieldRenderer({ config, fieldData, onChange }: FieldRendererProps) {
  const { fieldType, defaultUnit, allowedUnits, dropdownOptions, description } = config;

  // Helper to update specific field data
  const updateFieldData = (updates: Partial<ObjectiveFieldData>) => {
    onChange({ ...fieldData, ...updates });
  };

  switch (fieldType) {
    // ────────────────────────────────────────
    // GRID: Meses × Canales (con inversiones ADS/Promos)
    // ────────────────────────────────────────
    case 'grid_channel_month':
      return (
        <GridChannelMonth
          value={fieldData.gridChannelMonth || getEmptyGridData()}
          onChange={(gridChannelMonth) => updateFieldData({ gridChannelMonth })}
          adsPercent={fieldData.adsPercent || getEmptyInvestmentConfig()}
          onAdsPercentChange={(adsPercent) => updateFieldData({ adsPercent })}
          promosPercent={fieldData.promosPercent || getEmptyInvestmentConfig()}
          onPromosPercentChange={(promosPercent) => updateFieldData({ promosPercent })}
          actualRevenue={fieldData.actualRevenue || getEmptyGridData()}
          onActualRevenueChange={(actualRevenue) => updateFieldData({ actualRevenue })}
          actualAds={fieldData.actualAds || getEmptyGridData()}
          onActualAdsChange={(actualAds) => updateFieldData({ actualAds })}
          actualPromos={fieldData.actualPromos || getEmptyGridData()}
          onActualPromosChange={(actualPromos) => updateFieldData({ actualPromos })}
          unit={defaultUnit}
          label={`Objetivos de ${config.label.toLowerCase()}`}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // PERCENTAGE RANGE: De X% a Y%
    // ────────────────────────────────────────
    case 'percentage_range':
      return (
        <PercentageRange
          value={fieldData.percentageRange || getEmptyPercentageRange()}
          onChange={(percentageRange) => updateFieldData({ percentageRange })}
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // PERCENTAGE OR AMOUNT: Toggle % / € / uds
    // ────────────────────────────────────────
    case 'percentage_or_amount':
      return (
        <PercentageOrAmount
          value={fieldData.percentageRange || getEmptyPercentageRange()}
          onChange={(percentageRange) => updateFieldData({ percentageRange })}
          selectedUnit={fieldData.selectedUnit || defaultUnit}
          onUnitChange={(selectedUnit) => updateFieldData({ selectedUnit })}
          allowedUnits={allowedUnits || ['%', 'EUR']}
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // MINUTES: Tiempo en minutos
    // ────────────────────────────────────────
    case 'minutes':
      return (
        <MinutesInput
          value={fieldData.percentageRange || getEmptyPercentageRange()}
          onChange={(percentageRange) => updateFieldData({ percentageRange })}
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // NUMBER TARGET: Valor numérico simple
    // ────────────────────────────────────────
    case 'number_target':
      return (
        <NumberTarget
          value={fieldData.percentageRange?.targetValue || 0}
          onChange={(targetValue) =>
            updateFieldData({
              percentageRange: {
                currentValue: 0,
                targetValue,
              },
            })
          }
          label={config.label}
          description={description}
          unit={defaultUnit === 'uds' ? 'uds' : ''}
        />
      );

    // ────────────────────────────────────────
    // RATING BY CHANNEL: Glovo %, Uber ⭐, JustEat ⭐
    // ────────────────────────────────────────
    case 'rating_by_channel':
      return (
        <RatingByChannel
          value={fieldData.ratingByChannel || getEmptyRatingByChannel()}
          onChange={(ratingByChannel) => updateFieldData({ ratingByChannel })}
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // EMAIL ACTION: Input email + mailto
    // ────────────────────────────────────────
    case 'email_action':
      return (
        <EmailAction
          value={fieldData.emailAction || getEmptyEmailAction()}
          onChange={(emailAction) => updateFieldData({ emailAction })}
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // EMAIL WITH DROPDOWN: Email + selector proveedor
    // ────────────────────────────────────────
    case 'email_with_dropdown':
      return (
        <EmailWithDropdown
          value={fieldData.emailAction || getEmptyEmailAction()}
          onChange={(emailAction) => updateFieldData({ emailAction })}
          providers={dropdownOptions || []}
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // FREE TEXT: Texto libre
    // ────────────────────────────────────────
    case 'free_text':
      return (
        <FreeText
          value={fieldData.freeText || ''}
          onChange={(freeText) => updateFieldData({ freeText })}
          label="Descripción del objetivo"
          description={description}
        />
      );

    // ────────────────────────────────────────
    // DEADLINE ONLY: Solo fecha
    // ────────────────────────────────────────
    case 'deadline_only':
      return (
        <DeadlineOnly
          label={config.label}
          description={description}
        />
      );

    // ────────────────────────────────────────
    // DEFAULT: No field type matched
    // ────────────────────────────────────────
    default:
      return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">
            Tipo de campo no reconocido: {fieldType}
          </p>
        </div>
      );
  }
}
