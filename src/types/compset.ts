// ============================================
// PRODUCT TIERS (para selector de productos)
// ============================================

import type { Product } from './product';
import type { UserRole } from './user';

export type ProductTier = 'top' | 'tier2' | 'tier3' | 'new';

export interface ProductWithTier extends Product {
  tier: ProductTier;
  salesRank?: number;
  isNew?: boolean;
}

// ============================================
// USER INVITATIONS
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  assignedCompanyIds: string[];
  status: InvitationStatus;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  invitationNote: string | null;
}

export interface DbUserInvitation {
  id: string;
  email: string;
  role: string;
  assigned_company_ids: string[];
  status: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
  invitation_note: string | null;
}

// ============================================
// COMPSET (Competitive Set)
// ============================================

export type CompsetPlatform = 'glovo' | 'ubereats' | 'justeat';

export type NormalizedCategory =
  | 'principales'
  | 'entrantes'
  | 'postres'
  | 'combos'
  | 'bebidas';

export type CompsetPromoType =
  | 'discount_percent'
  | 'discount_amount'
  | 'bogo'
  | 'free_delivery'
  | 'free_item'
  | 'flash_offer'
  | 'stamp_card';

export interface CompsetCompetitor {
  id: string;
  companyId: string;
  brandId: string | null;
  addressId: string | null;
  name: string;
  platform: CompsetPlatform;
  externalStoreId: string | null;
  externalStoreUrl: string | null;
  logoUrl: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  displayOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbCompsetCompetitor {
  id: string;
  company_id: string;
  brand_id: string | null;
  address_id: string | null;
  name: string;
  platform: string;
  external_store_id: string | null;
  external_store_url: string | null;
  logo_url: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompsetSnapshot {
  id: string;
  competitorId: string;
  snapshotDate: string;
  rating: number | null;
  reviewCount: number | null;
  avgTicket: number | null;
  deliveryFee: number | null;
  serviceFee: number | null;
  minOrder: number | null;
  totalProducts: number | null;
  totalCategories: number | null;
  deliveryTimeMin: number | null;
  activePromoCount: number | null;
  rawData: Record<string, unknown> | null;
  createdAt: string;
}

export interface DbCompsetSnapshot {
  id: string;
  competitor_id: string;
  snapshot_date: string;
  rating: number | null;
  review_count: number | null;
  avg_ticket: number | null;
  delivery_fee: number | null;
  service_fee: number | null;
  min_order: number | null;
  total_products: number | null;
  total_categories: number | null;
  delivery_time_min: number | null;
  active_promo_count: number | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface CompsetProduct {
  id: string;
  competitorId: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  rawCategory: string | null;
  normalizedCategory: NormalizedCategory | null;
  isAvailable: boolean;
  createdAt: string;
}

export interface DbCompsetProduct {
  id: string;
  competitor_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  raw_category: string | null;
  normalized_category: string | null;
  is_available: boolean;
  created_at: string;
}

export interface CompsetPromotion {
  id: string;
  competitorId: string;
  promoType: CompsetPromoType;
  title: string | null;
  description: string | null;
  discountValue: number | null;
  discountUnit: string | null;
  isActive: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
}

export interface DbCompsetPromotion {
  id: string;
  competitor_id: string;
  promo_type: string;
  title: string | null;
  description: string | null;
  discount_value: number | null;
  discount_unit: string | null;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}
