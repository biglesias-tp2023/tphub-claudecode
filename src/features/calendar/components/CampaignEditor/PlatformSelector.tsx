import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PLATFORMS } from '../../config/platforms';
import type { CampaignPlatform } from '@/types';

interface PlatformSelectorProps {
  selected: CampaignPlatform | null;
  onSelect: (platform: CampaignPlatform) => void;
}

// Platform logo components (styled as SVGs)
function GlovoLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-lg', className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="8" fill="#FFC244" />
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#000"
          fontSize="20"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          G
        </text>
      </svg>
    </div>
  );
}

function UberEatsLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-lg', className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="8" fill="#142328" />
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#05C167"
          fontSize="20"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          UE
        </text>
      </svg>
    </div>
  );
}

function JustEatLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-lg', className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="8" fill="#FF8000" />
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#FFF"
          fontSize="20"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          JE
        </text>
      </svg>
    </div>
  );
}

function GoogleAdsLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-lg', className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect width="40" height="40" rx="8" fill="#4285F4" />
        <text
          x="50%"
          y="55%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#FFF"
          fontSize="16"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          Ads
        </text>
      </svg>
    </div>
  );
}

const PLATFORM_LOGOS: Record<CampaignPlatform, React.FC<{ className?: string }>> = {
  glovo: GlovoLogo,
  ubereats: UberEatsLogo,
  justeat: JustEatLogo,
  google_ads: GoogleAdsLogo,
};

export function PlatformSelector({ selected, onSelect }: PlatformSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona la plataforma</h3>
        <p className="text-sm text-gray-500">
          Elige la plataforma donde quieres crear la campaña promocional o publicitaria.
        </p>
      </div>

      {/* List format */}
      <div className="space-y-3">
        {Object.values(PLATFORMS).map(platform => {
          const Logo = PLATFORM_LOGOS[platform.id];
          const isSelected = selected === platform.id;

          return (
            <button
              key={platform.id}
              onClick={() => onSelect(platform.id)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                'hover:shadow-md',
                isSelected
                  ? 'bg-primary-50 border-primary-500 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Platform logo */}
              <Logo className="w-12 h-12 shrink-0" />

              {/* Platform info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-semibold text-lg',
                    isSelected ? 'text-primary-900' : 'text-gray-900'
                  )}>
                    {platform.name}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {platform.id === 'glovo' && 'Promociones y publicidad en Glovo'}
                  {platform.id === 'ubereats' && 'Promociones en Uber Eats'}
                  {platform.id === 'justeat' && 'Promociones y publicidad en Just Eat'}
                  {platform.id === 'google_ads' && 'Campañas de publicidad en Google'}
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <CheckCircle2 className="w-6 h-6 text-primary-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
