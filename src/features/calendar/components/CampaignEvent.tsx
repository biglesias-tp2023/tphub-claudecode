import { cn } from '@/utils/cn';
import { PLATFORMS, getCampaignTypeConfig } from '../config/platforms';
import type { PromotionalCampaign } from '@/types';

interface CampaignEventProps {
  campaign: PromotionalCampaign;
  onClick?: () => void;
  isStart?: boolean;
  isEnd?: boolean;
  isMultiDay?: boolean;
  isPast?: boolean;
}

export function CampaignEvent({
  campaign,
  onClick,
  isStart = true,
  isEnd = true,
  isMultiDay = false,
  isPast = false,
}: CampaignEventProps) {
  const platform = PLATFORMS[campaign.platform];
  const typeConfig = getCampaignTypeConfig(campaign.platform, campaign.campaignType);

  const isCompleted = campaign.status === 'completed';
  const isActive = campaign.status === 'active';
  const isCancelled = campaign.status === 'cancelled';

  // Past days or completed campaigns get grayed out
  const isGrayed = isPast || isCompleted;

  // Determine display text
  const displayText = campaign.name || typeConfig?.label || campaign.campaignType;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left text-xs font-medium truncate transition-all',
        'rounded px-1.5 py-0.5',
        // Multi-day spanning styles
        !isStart && 'rounded-l-none',
        !isEnd && 'rounded-r-none',
        // Past/completed styles - gray out
        isGrayed && 'bg-gray-100 text-gray-500',
        isCancelled && 'bg-gray-100 text-gray-400 line-through',
        // Active campaigns (not past) get pulse effect
        isActive && !isPast && [
          platform.bgColor,
          'ring-2 ring-offset-1',
          platform.borderColor.replace('border', 'ring'),
          'animate-pulse',
        ],
        // Scheduled campaigns (not past, not active, not cancelled)
        !isGrayed && !isActive && !isCancelled && [
          platform.bgColor,
          'hover:opacity-80',
        ]
      )}
      title={`${platform.name}: ${displayText}`}
    >
      {/* Only show text on start day or single day */}
      {(isStart || !isMultiDay) && (
        <span className="flex items-center gap-1">
          {/* Platform indicator dot */}
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              isGrayed || isCancelled ? 'bg-gray-400' : ''
            )}
            style={{
              backgroundColor: !isGrayed && !isCancelled ? platform.color : undefined,
            }}
          />
          <span className="truncate">{displayText}</span>
        </span>
      )}
    </button>
  );
}

interface CampaignEventCompactProps {
  campaign: PromotionalCampaign;
  onClick?: () => void;
  isPast?: boolean;
}

/**
 * Compact version for showing multiple campaigns in a day cell
 */
export function CampaignEventCompact({ campaign, onClick, isPast = false }: CampaignEventCompactProps) {
  const platform = PLATFORMS[campaign.platform];
  const isCompleted = campaign.status === 'completed';
  const isActive = campaign.status === 'active';
  const isCancelled = campaign.status === 'cancelled';
  const isGrayed = isPast || isCompleted;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-2 h-2 rounded-full transition-transform hover:scale-125',
        isGrayed && 'bg-gray-400',
        isCancelled && 'bg-gray-300',
        isActive && !isPast && 'animate-pulse'
      )}
      style={{
        backgroundColor: !isGrayed && !isCancelled ? platform.color : undefined,
      }}
      title={`${platform.name}: ${campaign.name || campaign.campaignType}`}
    />
  );
}
