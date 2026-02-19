// ============================================
// PRODUCT
// ============================================
export interface ProductPricing {
  glovo?: number;
  ubereats?: number;
  justeat?: number;
}

export interface ChannelIds {
  glovo?: string;
  ubereats?: string;
  justeat?: string;
}

export interface Product {
  id: string;
  brandId: string;                  // FK → Brand
  companyId: string;                // FK → Company (denormalizado)
  name: string;
  description?: string;
  category: string;
  pricing: ProductPricing;
  imageUrl?: string;
  isActive: boolean;
  channelIds: ChannelIds;
}
