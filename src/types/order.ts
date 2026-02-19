// ============================================
// ORDER
// ============================================

import type { ChannelId } from './channel';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: OrderItemModifier[];
}

export interface OrderCustomer {
  name?: string;
  isNewCustomer: boolean;
}

export interface Order {
  id: string;
  externalId: string;               // ID del canal (Glovo/UberEats/JustEat)

  // Jerarquía completa (denormalizado para queries)
  companyId: string;                // FK → Company
  brandId: string;                  // FK → Brand
  areaId: string;                   // FK → Area
  restaurantId: string;             // FK → Restaurant
  channel: ChannelId;               // Canal de origen

  status: OrderStatus;
  items: OrderItem[];

  // Financiero
  subtotal: number;
  channelFee: number;               // Comisión del canal
  deliveryFee: number;
  discount: number;
  total: number;
  netRevenue: number;

  customer?: OrderCustomer;

  // Tiempos
  orderedAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;
  scrapedAt: string;
}
