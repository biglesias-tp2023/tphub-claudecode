/**
 * Export data types for PDF, Excel, and CSV exports.
 *
 * @module utils/export/types
 */

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface SalesProjectionExportData {
  title: string;
  dateRange: string;
  channels: string[];
  months: { key: string; label: string }[];
  targetRevenue: Record<string, Record<string, number>>;
  actualRevenue: Record<string, Record<string, number>>;
  targetAds: Record<string, Record<string, number>>;
  actualAds: Record<string, Record<string, number>>;
  targetPromos: Record<string, Record<string, number>>;
  actualPromos: Record<string, Record<string, number>>;
}

export interface ObjectiveExportData {
  id: string;
  title: string;
  category: string;
  status: string;
  responsible: string;
  deadline: string;
  daysRemaining: number;
  kpiCurrent?: number;
  kpiTarget?: number;
  kpiUnit?: string;
  progress?: number;
  tasks?: TaskExportData[];
}

export interface TaskExportData {
  title: string;
  responsible: string;
  deadline: string;
  isCompleted: boolean;
}

export interface ControllingExportData {
  portfolio: {
    ventas: number;
    ventasChange: number;
    pedidos: number;
    pedidosChange: number;
    ticketMedio: number;
    ticketMedioChange: number;
    openTime: number;
    openTimeChange: number;
    inversionAds: number;
    inversionAdsChange: number;
    adsPercentage: number;
    inversionPromos: number;
    inversionPromosChange: number;
    promosPercentage: number;
    reembolsos: number;
    reembolsosChange: number;
    reembolsosPercentage: number;
  };
  channels: {
    channel: string;
    name: string;
    revenue: number;
    revenueChange: number;
    percentage: number;
    pedidos: number;
    pedidosPercentage: number;
    ticketMedio: number;
    openTime: number;
    ads: number;
    adsPercentage: number;
    promos: number;
    promosPercentage: number;
    reembolsos: number;
    reembolsosPercentage: number;
  }[];
  hierarchy: {
    name: string;
    level: string;
    ventas: number;
    ventasChange: number;
    pedidos: number;
    ticketMedio: number;
    nuevosClientes: number;
    porcentajeNuevos: number;
    openTime: number;
    ratioConversion: number;
    tiempoEspera: string;
    valoraciones: number;
    inversionAds: number;
    adsPercentage: number;
    roas: number;
    inversionPromos: number;
    promosPercentage: number;
    promosRoas: number;
  }[];
  dateRange: string;
}

export interface ReputationExportData {
  channelRatings: {
    channel: string;
    rating: number;
    totalReviews: number;
    positivePercent: number;
    negativePercent: number;
  }[];
  summary: {
    totalReviews: number;
    negativeReviews: number;
  };
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  reviews: {
    id: string;
    channel: string;
    orderId: string;
    rating: number;
    date: string;
    time: string;
  }[];
  dateRange: string;
}

export interface ObjectivesTableExportData {
  rows: {
    restaurantName: string;
    channel: string;
    months: {
      month: string;
      revenueTarget?: number;
      revenueActual?: number;
      adsTarget?: number;
      adsActual?: number;
      promosTarget?: number;
      promosActual?: number;
      foodcostTarget?: number;
    }[];
  }[];
  dateRange: string;
}

export interface AuditExportSection {
  title: string;
  icon?: string;
  fields: AuditExportField[];
}

export interface AuditExportField {
  key: string;
  label: string;
  type: 'checkbox' | 'score' | 'text' | 'select' | 'number' | 'multiselect' | 'datetime' | 'time' | 'company_select' | 'user_select' | 'file' | 'image_upload' | 'rating' | 'textarea' | 'multi_select' | 'tag_input';
  value: unknown;
  maxScore?: number;
  scoreLabels?: string[];
}

export interface AuditExportData {
  auditNumber: string;
  auditType: string;
  scope: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
  sections: AuditExportSection[];
  totalScore?: {
    obtained: number;
    maximum: number;
    percentage: number;
  };
}
