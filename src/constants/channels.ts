import type { Channel, ChannelId } from '@/types';

/**
 * Channel configuration for delivery platforms.
 * Contains metadata for Glovo, Uber Eats, and Just Eat.
 */
export const CHANNELS: Record<ChannelId, Channel> = {
  glovo: {
    id: 'glovo',
    name: 'Glovo',
    color: '#ffc244',
    logoUrl: '/images/channels/glovo.svg',
    isActive: true,
  },
  ubereats: {
    id: 'ubereats',
    name: 'Uber Eats',
    color: '#06c167',
    logoUrl: '/images/channels/ubereats.svg',
    isActive: true,
  },
  justeat: {
    id: 'justeat',
    name: 'Just Eat',
    color: '#ff8000',
    logoUrl: '/images/channels/justeat.svg',
    isActive: true,
  },
} as const;
