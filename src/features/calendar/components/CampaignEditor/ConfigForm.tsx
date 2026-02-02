import { Input } from '@/components/ui/Input';
import { getCampaignTypeConfig, type CampaignFieldConfig } from '../../config/platforms';
import { ProductSelector } from './ProductSelector';
import type { CampaignPlatform, CampaignConfig, Restaurant } from '@/types';

interface ConfigFormProps {
  platform: CampaignPlatform;
  campaignType: string;
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  /** Restaurant for fetching products */
  restaurant?: Restaurant | null;
  /** Selected product IDs */
  productIds?: string[];
  /** Callback when product selection changes */
  onProductIdsChange?: (ids: string[]) => void;
}

interface FieldProps {
  field: CampaignFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}

function ConfigField({ field, value, onChange }: FieldProps) {
  switch (field.type) {
    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value as number || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              className="w-32"
            />
            {field.suffix && (
              <span className="text-sm text-gray-500">{field.suffix}</span>
            )}
          </div>
        </div>
      );

    case 'percent': {
      // Generate percentage options based on min/max
      const minVal = field.min || 5;
      const maxVal = field.max || 50;
      const step = 5;
      const options: number[] = [];
      for (let i = minVal; i <= maxVal; i += step) {
        options.push(i);
      }

      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={value as number || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Seleccionar</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}%</option>
            ))}
          </select>
        </div>
      );
    }

    case 'currency':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value as number || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
              min={field.min || 0}
              step="0.01"
              placeholder={field.placeholder}
              className="w-32"
            />
            <span className="text-sm text-gray-500">EUR</span>
          </div>
        </div>
      );

    case 'time':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Input
            type="time"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-32"
          />
        </div>
      );

    case 'keywords':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Input
            type="text"
            value={(value as string[] || []).join(', ')}
            onChange={(e) => {
              const keywords = e.target.value
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);
              onChange(keywords);
            }}
            placeholder="pizza, hamburguesa, comida rapida"
            className="w-full"
          />
          <p className="text-xs text-gray-400 mt-1">
            Separa las palabras clave con comas
          </p>
        </div>
      );

    case 'target_customers': {
      // Generate options from min to max (3 to 15 by default)
      const minVal = field.min || 3;
      const maxVal = field.max || 15;
      const options: number[] = [];
      for (let i = minVal; i <= maxVal; i++) {
        options.push(i);
      }

      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={value as number || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Seleccionar target</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt} nuevos clientes/dia</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Selecciona cuantos nuevos clientes quieres conseguir por dia
          </p>
        </div>
      );
    }

    case 'product':
    case 'products':
      // Product selection is handled separately by ProductSelector component
      return null;

    default:
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <Input
            type="text"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}

export function ConfigForm({
  platform,
  campaignType,
  config,
  onChange,
  restaurant,
  productIds = [],
  onProductIdsChange,
}: ConfigFormProps) {
  const typeConfig = getCampaignTypeConfig(platform, campaignType);

  if (!typeConfig) {
    return (
      <div className="text-center py-8 text-gray-500">
        Tipo de campaña no reconocido
      </div>
    );
  }

  // Filter out product fields (handled with ProductSelector)
  const configFields = typeConfig.fields.filter(f => f.type !== 'product' && f.type !== 'products');
  const productFields = typeConfig.fields.filter(f => f.type === 'product' || f.type === 'products');

  const handleFieldChange = (key: string, value: unknown) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  // Check if this is a flash offer (has fixed 30% discount)
  const isFlashOffer = campaignType === 'flash_offer' && platform === 'glovo';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configuracion de {typeConfig.label}
        </h3>
        <p className="text-sm text-gray-500">{typeConfig.description}</p>
      </div>

      {/* Flash offer fixed discount info */}
      {isFlashOffer && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-amber-700">30%</span>
            <span className="text-sm font-medium text-amber-700">descuento</span>
          </div>
          <p className="text-sm text-amber-600">
            El descuento del 30% para nuevos clientes viene configurado por defecto en las Ofertas Flash de Glovo.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {configFields.map(field => (
          <ConfigField
            key={field.key}
            field={field}
            value={config[field.key as keyof CampaignConfig]}
            onChange={(value) => handleFieldChange(field.key, value)}
          />
        ))}
      </div>

      {/* Product selection */}
      {productFields.length > 0 && restaurant && onProductIdsChange && (
        <div className="border-t border-gray-200 pt-6">
          {productFields.map(field => (
            <ProductSelector
              key={field.key}
              companyId={restaurant.companyId}
              platform={platform}
              multiple={field.type === 'products'}
              selectedIds={productIds}
              onChange={onProductIdsChange}
              addressId={restaurant.id}
              label={field.label}
              required={field.required}
            />
          ))}
        </div>
      )}

      {/* Warning if no restaurant selected */}
      {productFields.length > 0 && !restaurant && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Selecciona un establecimiento para ver los productos disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
