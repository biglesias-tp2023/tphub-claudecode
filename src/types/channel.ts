// ============================================
// CHANNEL (Canal de delivery)
// ============================================
export type ChannelId = 'glovo' | 'ubereats' | 'justeat';

export interface Channel {
  id: ChannelId;
  name: string;
  color: string;
  logoUrl: string;
  isActive: boolean;
}
