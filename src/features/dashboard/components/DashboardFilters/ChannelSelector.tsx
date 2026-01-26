import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { CHANNELS } from '@/constants/channels';
import { cn } from '@/utils/cn';
import type { ChannelId } from '@/types';

interface ChannelSelectorProps {
  className?: string;
  /** Channels to exclude from the selector (e.g., ['justeat'] if no data) */
  excludeChannels?: ChannelId[];
}

// Text colors for selected state (ensures contrast)
const CHANNEL_TEXT_COLORS: Record<ChannelId, string> = {
  glovo: '#7c4a00',      // Dark amber for yellow bg
  ubereats: '#ffffff',   // White for green bg
  justeat: '#ffffff',    // White for orange bg
};

// Background colors for selected state (lighter versions)
const CHANNEL_BG_SELECTED: Record<ChannelId, string> = {
  glovo: '#ffc244',
  ubereats: '#06c167',
  justeat: '#ff8000',
};

// Border colors when not selected (subtle brand hint)
const CHANNEL_BORDER_COLORS: Record<ChannelId, string> = {
  glovo: '#ffc244',
  ubereats: '#06c167',
  justeat: '#ff8000',
};

export function ChannelSelector({ className, excludeChannels = [] }: ChannelSelectorProps) {
  const { channelIds, toggleChannelId } = useDashboardFiltersStore();

  // Filter out excluded channels
  const channels = Object.values(CHANNELS).filter(
    (channel) => !excludeChannels.includes(channel.id)
  );

  // If no channels selected, all are "active" (show all data)
  const showAll = channelIds.length === 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {channels.map((channel) => {
        const isSelected = showAll || channelIds.includes(channel.id);

        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => toggleChannelId(channel.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              'border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isSelected
                ? 'shadow-sm'
                : 'bg-white hover:bg-gray-50'
            )}
            style={{
              backgroundColor: isSelected ? CHANNEL_BG_SELECTED[channel.id] : undefined,
              borderColor: isSelected ? CHANNEL_BG_SELECTED[channel.id] : CHANNEL_BORDER_COLORS[channel.id],
              color: isSelected ? CHANNEL_TEXT_COLORS[channel.id] : '#6b7280',
            }}
            title={channel.name}
          >
            {channel.name}
          </button>
        );
      })}
    </div>
  );
}
