// ============================================
// RESTAURANT_KPIS (KPIs agregados por periodo)
// ============================================

export type PeriodType = 'daily' | 'weekly' | 'monthly';

/**
 * RestaurantKpis from Supabase restaurant_kpis table
 */
export interface RestaurantKpis {
  id: string;                       // UUID
  restaurantId: string;             // FK → Restaurant (UUID)
  periodDate: string;               // Date string (YYYY-MM-DD)
  periodType: PeriodType;

  // General KPIs
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  avgDeliveryTimeMin: number | null;
  avgRating: number | null;
  newCustomers: number;
  newCustomerPct: number | null;

  // Per channel
  ordersGlovo: number;
  ordersUbereats: number;
  ordersJusteat: number;
  revenueGlovo: number;
  revenueUbereats: number;
  revenueJusteat: number;

  // Incidences
  incidenceCount: number;
  incidenceRate: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface DbRestaurantKpis {
  id: string;
  restaurant_id: string;
  period_date: string;
  period_type: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  avg_delivery_time_min: number | null;
  avg_rating: number | null;
  new_customers: number;
  new_customer_pct: number | null;
  orders_glovo: number;
  orders_ubereats: number;
  orders_justeat: number;
  revenue_glovo: number;
  revenue_ubereats: number;
  revenue_justeat: number;
  incidence_count: number;
  incidence_rate: number | null;
  created_at: string;
  updated_at: string;
}
