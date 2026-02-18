import type {
  CompsetCompetitor,
  DbCompsetCompetitor,
  CompsetSnapshot,
  DbCompsetSnapshot,
  CompsetProduct,
  DbCompsetProduct,
  CompsetPromotion,
  DbCompsetPromotion,
  CompsetPlatform,
  NormalizedCategory,
  CompsetPromoType,
} from '@/types';

export function mapCompetitor(db: DbCompsetCompetitor): CompsetCompetitor {
  return {
    id: db.id,
    companyId: db.company_id,
    brandId: db.brand_id,
    addressId: db.address_id,
    name: db.name,
    platform: db.platform as CompsetPlatform,
    externalStoreId: db.external_store_id,
    externalStoreUrl: db.external_store_url,
    logoUrl: db.logo_url,
    address: db.address,
    latitude: db.latitude,
    longitude: db.longitude,
    isActive: db.is_active,
    displayOrder: db.display_order,
    createdBy: db.created_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapSnapshot(db: DbCompsetSnapshot): CompsetSnapshot {
  return {
    id: db.id,
    competitorId: db.competitor_id,
    snapshotDate: db.snapshot_date,
    rating: db.rating,
    reviewCount: db.review_count,
    avgTicket: db.avg_ticket,
    deliveryFee: db.delivery_fee,
    serviceFee: db.service_fee,
    minOrder: db.min_order,
    totalProducts: db.total_products,
    totalCategories: db.total_categories,
    deliveryTimeMin: db.delivery_time_min,
    activePromoCount: db.active_promo_count,
    rawData: db.raw_data,
    createdAt: db.created_at,
  };
}

export function mapProduct(db: DbCompsetProduct): CompsetProduct {
  return {
    id: db.id,
    competitorId: db.competitor_id,
    name: db.name,
    price: db.price,
    description: db.description,
    imageUrl: db.image_url,
    rawCategory: db.raw_category,
    normalizedCategory: db.normalized_category as NormalizedCategory | null,
    isAvailable: db.is_available,
    createdAt: db.created_at,
  };
}

export function mapPromotion(db: DbCompsetPromotion): CompsetPromotion {
  return {
    id: db.id,
    competitorId: db.competitor_id,
    promoType: db.promo_type as CompsetPromoType,
    title: db.title,
    description: db.description,
    discountValue: db.discount_value,
    discountUnit: db.discount_unit,
    isActive: db.is_active,
    firstSeenAt: db.first_seen_at,
    lastSeenAt: db.last_seen_at,
    createdAt: db.created_at,
  };
}
