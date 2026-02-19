import { HelpCircle, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  getPromotionsForPlatform,
  getAdsForPlatform,
  PLATFORMS,
  type CampaignTypeConfig,
} from '../../config/platforms';
import type { CampaignPlatform } from '@/types';

interface CampaignTypeSelectorProps {
  platform: CampaignPlatform;
  selected: string | null;
  onSelect: (typeId: string) => void;
}

// Helper to get Lucide icon by name
function getIcon(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || HelpCircle;
}

function CampaignTypeCard({
  config,
  isSelected,
  onClick,
}: {
  config: CampaignTypeConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  /* eslint-disable react-hooks/static-components */
  const Icon = getIcon(config.icon);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
        'hover:shadow-sm',
        isSelected
          ? 'bg-primary-50 border-primary-500 shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={cn(
          'font-medium',
          isSelected ? 'text-primary-900' : 'text-gray-900'
        )}>
          {config.label}
        </h4>
        <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
      </div>

      {isSelected && (
        <div className="shrink-0">
          <LucideIcons.CheckCircle2 className="w-5 h-5 text-primary-600" />
        </div>
      )}
    </button>
  );
  /* eslint-enable react-hooks/static-components */
}

export function CampaignTypeSelector({ platform, selected, onSelect }: CampaignTypeSelectorProps) {
  const platformConfig = PLATFORMS[platform];
  const promotions = getPromotionsForPlatform(platform);
  const ads = getAdsForPlatform(platform);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Tipo de campaña en {platformConfig.name}
        </h3>
        <p className="text-sm text-gray-500">
          Selecciona el tipo de campaña que deseas crear.
        </p>
      </div>

      {/* Promotions section */}
      {promotions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <LucideIcons.Tag className="w-4 h-4" />
            Promociones
          </h4>
          <div className="grid gap-3">
            {promotions.map(config => (
              <CampaignTypeCard
                key={config.id}
                config={config}
                isSelected={selected === config.id}
                onClick={() => onSelect(config.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ads section */}
      {ads.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <LucideIcons.Megaphone className="w-4 h-4" />
            Publicidad
          </h4>
          <div className="grid gap-3">
            {ads.map(config => (
              <CampaignTypeCard
                key={config.id}
                config={config}
                isSelected={selected === config.id}
                onClick={() => onSelect(config.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
