/**
 * Utilidades de exportación - PDF, Excel, CSV
 *
 * Libraries are loaded dynamically to reduce initial bundle size:
 * - jsPDF + jspdf-autotable: ~200KB (loaded only when generating PDFs)
 * - xlsx: ~400KB (loaded only when generating Excel files)
 *
 * All PDF and Excel export functions are async to support dynamic imports.
 *
 * @module utils/export
 */

import type { jsPDF } from 'jspdf';

// ============================================
// DYNAMIC IMPORTS
// ============================================

type JsPDFClass = typeof import('jspdf').jsPDF;
type AutoTableFn = typeof import('jspdf-autotable').default;
type XLSXLib = typeof import('xlsx');

// Cached library instances for subsequent calls
let cachedJsPDF: JsPDFClass | null = null;
let cachedAutoTable: AutoTableFn | null = null;
let cachedXLSX: XLSXLib | null = null;

/**
 * Dynamically load jsPDF and autoTable plugins.
 * Caches the loaded modules for subsequent calls.
 */
async function loadPdfLibraries(): Promise<{ jsPDF: JsPDFClass; autoTable: AutoTableFn }> {
  if (!cachedJsPDF || !cachedAutoTable) {
    const [jspdfModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    cachedJsPDF = jspdfModule.jsPDF;
    cachedAutoTable = autoTableModule.default;
  }
  return { jsPDF: cachedJsPDF, autoTable: cachedAutoTable };
}

/**
 * Dynamically load XLSX library.
 * Caches the loaded module for subsequent calls.
 */
async function loadXlsxLibrary(): Promise<XLSXLib> {
  if (!cachedXLSX) {
    cachedXLSX = await import('xlsx');
  }
  return cachedXLSX;
}

/**
 * Pre-load PDF libraries (call on hover for better UX)
 */
export function preloadPdfLibraries(): void {
  loadPdfLibraries().catch(() => {
    // Silent fail - will retry on actual export
  });
}

/**
 * Pre-load Excel library (call on hover for better UX)
 */
export function preloadExcelLibrary(): void {
  loadXlsxLibrary().catch(() => {
    // Silent fail - will retry on actual export
  });
}

// ============================================
// BRAND CONFIG
// ============================================

const BRAND = {
  name: 'ThinkPaladar',
  tagline: 'Consultoría de Delivery',
  colors: {
    primary: [37, 99, 235] as [number, number, number],
    secondary: [99, 102, 241] as [number, number, number],
    accent: [16, 185, 129] as [number, number, number],
    dark: [30, 41, 59] as [number, number, number],
    gray: [100, 116, 139] as [number, number, number],
  },
  logoText: 'TP',
};

/**
 * Añade header con branding de ThinkPaladar al PDF
 */
function addBrandedHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND.colors.primary);
  doc.circle(22, 18, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND.logoText, 22, 20, { align: 'center' });

  doc.setTextColor(...BRAND.colors.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND.name, 34, 16);

  doc.setTextColor(...BRAND.colors.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.tagline, 34, 21);

  doc.setDrawColor(...BRAND.colors.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 28, pageWidth - 14, 28);

  doc.setTextColor(...BRAND.colors.primary);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 40);

  let yPos = 48;
  if (subtitle) {
    doc.setTextColor(...BRAND.colors.gray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, yPos);
    yPos += 8;
  }

  return yPos;
}

/**
 * Añade footer con branding a todas las páginas del PDF
 */
function addBrandedFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...BRAND.colors.primary);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(BRAND.name, 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.colors.gray);
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );

    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
  }
}

const BRANDED_TABLE_STYLES = {
  headStyles: {
    fillColor: BRAND.colors.primary,
    textColor: [255, 255, 255] as [number, number, number],
    fontSize: 8,
    fontStyle: 'bold' as const,
  },
  bodyStyles: {
    fontSize: 8,
    textColor: BRAND.colors.dark,
  },
  alternateRowStyles: {
    fillColor: [248, 250, 252] as [number, number, number],
  },
  theme: 'striped' as const,
};

// ============================================
// TYPES
// ============================================

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
    trend: number;
  }[];
  summary: {
    totalBilling: number;
    totalRefunds: number;
  };
  errorTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  reviews: {
    id: string;
    channel: string;
    restaurant: string;
    rating: number;
    comment: string;
    date: string;
    orderNumber: string;
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
  type: 'checkbox' | 'score' | 'text' | 'select' | 'number' | 'multiselect' | 'datetime' | 'time' | 'company_select' | 'user_select' | 'file';
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

// ============================================
// HELPERS
// ============================================

const formatDate = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

const formatNumber = (n: number): string => {
  if (!n || isNaN(n)) return '0';
  return n.toLocaleString('es-ES');
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function formatFieldValue(field: AuditExportField): string {
  const { value, type, maxScore, scoreLabels } = field;

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (type) {
    case 'checkbox':
      return value ? 'Sí' : 'No';
    case 'score':
      if (typeof value === 'number') {
        const label = scoreLabels?.[value - 1] || '';
        return `${value}/${maxScore || 5}${label ? ` (${label})` : ''}`;
      }
      return '-';
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value);
    case 'multiselect':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'datetime':
      if (typeof value === 'string') {
        try {
          const date = new Date(value);
          return date.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
        } catch {
          return String(value);
        }
      }
      return '-';
    case 'time':
      return typeof value === 'string' ? value : '-';
    case 'company_select':
    case 'user_select':
      return typeof value === 'string' ? value : '-';
    case 'file':
      if (Array.isArray(value) && value.length > 0) {
        const files = value as { name: string }[];
        return files.map((f) => f.name).join(', ');
      }
      return '-';
    case 'text':
    case 'select':
    default:
      return String(value);
  }
}

// ============================================
// CSV EXPORT (No external dependencies)
// ============================================

export function exportToCSV(data: Record<string, unknown>[], filename: string, columns?: ExportColumn[]) {
  if (!data.length) return;

  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);
  const headers = columns ? columns.map(c => c.header) : keys;

  const csvContent = [
    headers.join(';'),
    ...data.map(row =>
      keys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(';')) return `"${val}"`;
        return String(val);
      }).join(';')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}_${formatDate()}.csv`);
}

export function exportSalesProjectionToCSV(data: SalesProjectionExportData) {
  const rows: Record<string, unknown>[] = [];

  data.channels.forEach(ch => {
    const row: Record<string, unknown> = { tipo: 'Facturación Objetivo', canal: ch };
    data.months.forEach(m => { row[m.label] = data.targetRevenue[m.key]?.[ch] || 0; });
    rows.push(row);
  });

  data.channels.forEach(ch => {
    const row: Record<string, unknown> = { tipo: 'Facturación Real', canal: ch };
    data.months.forEach(m => { row[m.label] = data.actualRevenue[m.key]?.[ch] || 0; });
    rows.push(row);
  });

  data.channels.forEach(ch => {
    const row: Record<string, unknown> = { tipo: 'ADS Objetivo', canal: ch };
    data.months.forEach(m => { row[m.label] = data.targetAds[m.key]?.[ch] || 0; });
    rows.push(row);
  });

  data.channels.forEach(ch => {
    const row: Record<string, unknown> = { tipo: 'ADS Real', canal: ch };
    data.months.forEach(m => { row[m.label] = data.actualAds[m.key]?.[ch] || 0; });
    rows.push(row);
  });

  data.channels.forEach(ch => {
    const row: Record<string, unknown> = { tipo: 'Promos Objetivo', canal: ch };
    data.months.forEach(m => { row[m.label] = data.targetPromos[m.key]?.[ch] || 0; });
    rows.push(row);
  });

  data.channels.forEach(ch => {
    const row: Record<string, unknown> = { tipo: 'Promos Real', canal: ch };
    data.months.forEach(m => { row[m.label] = data.actualPromos[m.key]?.[ch] || 0; });
    rows.push(row);
  });

  const columns: ExportColumn[] = [
    { header: 'Tipo', key: 'tipo' },
    { header: 'Canal', key: 'canal' },
    ...data.months.map(m => ({ header: m.label, key: m.label }))
  ];

  exportToCSV(rows, `proyeccion_ventas_${data.title}`, columns);
}

export function exportObjectivesToCSV(objectives: ObjectiveExportData[], restaurantName: string) {
  const rows = objectives.map(obj => ({
    titulo: obj.title,
    categoria: obj.category,
    estado: obj.status,
    responsable: obj.responsible,
    fecha_limite: obj.deadline,
    dias_restantes: obj.daysRemaining,
    kpi_actual: obj.kpiCurrent || '',
    kpi_objetivo: obj.kpiTarget || '',
    unidad: obj.kpiUnit || '',
    progreso: obj.progress ? `${obj.progress}%` : ''
  }));

  const columns: ExportColumn[] = [
    { header: 'Título', key: 'titulo' },
    { header: 'Categoría', key: 'categoria' },
    { header: 'Estado', key: 'estado' },
    { header: 'Responsable', key: 'responsable' },
    { header: 'Fecha Límite', key: 'fecha_limite' },
    { header: 'Días Restantes', key: 'dias_restantes' },
    { header: 'KPI Actual', key: 'kpi_actual' },
    { header: 'KPI Objetivo', key: 'kpi_objetivo' },
    { header: 'Unidad', key: 'unidad' },
    { header: 'Progreso', key: 'progreso' },
  ];

  exportToCSV(rows, `objetivos_${restaurantName}`, columns);
}

export function exportControllingToCSV(data: ControllingExportData) {
  const portfolioRows = [
    { metrica: 'Ventas', valor: data.portfolio.ventas, variacion: `${data.portfolio.ventasChange.toFixed(1)}%` },
    { metrica: 'Pedidos', valor: data.portfolio.pedidos, variacion: `${data.portfolio.pedidosChange.toFixed(1)}%` },
    { metrica: 'Ticket Medio', valor: data.portfolio.ticketMedio.toFixed(2), variacion: `${data.portfolio.ticketMedioChange.toFixed(1)}%` },
    { metrica: 'Open Time', valor: `${data.portfolio.openTime.toFixed(1)}%`, variacion: `${data.portfolio.openTimeChange.toFixed(1)}%` },
    { metrica: 'Inversión Ads', valor: data.portfolio.inversionAds, variacion: `${data.portfolio.inversionAdsChange.toFixed(1)}%` },
    { metrica: 'Inversión Promos', valor: data.portfolio.inversionPromos, variacion: `${data.portfolio.inversionPromosChange.toFixed(1)}%` },
    { metrica: 'Reembolsos', valor: data.portfolio.reembolsos, variacion: `${data.portfolio.reembolsosChange.toFixed(1)}%` },
  ];

  const channelRows = data.channels.map((ch) => ({
    canal: ch.name, ventas: ch.revenue, variacion: `${ch.revenueChange.toFixed(1)}%`,
    porcentaje: `${ch.percentage.toFixed(1)}%`, pedidos: ch.pedidos, ticket_medio: ch.ticketMedio.toFixed(2),
    open_time: `${ch.openTime.toFixed(1)}%`, ads: ch.ads, ads_pct: `${ch.adsPercentage.toFixed(1)}%`,
    promos: ch.promos, promos_pct: `${ch.promosPercentage.toFixed(1)}%`,
  }));

  const hierarchyRows = data.hierarchy.map((row) => ({
    nombre: row.name, nivel: row.level, ventas: row.ventas, variacion: `${row.ventasChange.toFixed(1)}%`,
    pedidos: row.pedidos, ticket_medio: row.ticketMedio.toFixed(2), nuevos_clientes: row.nuevosClientes,
    pct_nuevos: `${row.porcentajeNuevos.toFixed(1)}%`, open_time: `${row.openTime.toFixed(1)}%`,
    conversion: `${row.ratioConversion.toFixed(1)}%`, t_espera: row.tiempoEspera, rating: row.valoraciones.toFixed(1),
    ads: row.inversionAds, ads_pct: `${row.adsPercentage.toFixed(1)}%`, roas: row.roas.toFixed(2),
    promos: row.inversionPromos, promos_pct: `${row.promosPercentage.toFixed(1)}%`,
  }));

  const csvContent = [
    `CONTROLLING - ${data.dateRange}`, '',
    'RESUMEN CARTERA', 'Métrica;Valor;Variación',
    ...portfolioRows.map((r) => `${r.metrica};${r.valor};${r.variacion}`), '',
    'RENDIMIENTO POR CANAL', 'Canal;Ventas;Variación;% Total;Pedidos;Ticket;Open Time;Ads;Ads %;Promos;Promos %',
    ...channelRows.map((r) => `${r.canal};${r.ventas};${r.variacion};${r.porcentaje};${r.pedidos};${r.ticket_medio};${r.open_time};${r.ads};${r.ads_pct};${r.promos};${r.promos_pct}`), '',
    'DETALLE JERARQUÍA', 'Nombre;Nivel;Ventas;Var.;Pedidos;Ticket;Nuevos;% Nuevos;Open;Conv.;T.Espera;Rating;Ads;Ads %;ROAS;Promos;Promos %',
    ...hierarchyRows.map((r) => `${r.nombre};${r.nivel};${r.ventas};${r.variacion};${r.pedidos};${r.ticket_medio};${r.nuevos_clientes};${r.pct_nuevos};${r.open_time};${r.conversion};${r.t_espera};${r.rating};${r.ads};${r.ads_pct};${r.roas};${r.promos};${r.promos_pct}`),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `controlling_${formatDate()}.csv`);
}

export function exportReputationToCSV(data: ReputationExportData) {
  const csvContent = [
    `REPUTACIÓN - ${data.dateRange}`, '',
    'RATINGS POR CANAL', 'Canal;Rating;Reviews;Tendencia',
    ...data.channelRatings.map((r) => `${r.channel};${r.rating.toFixed(1)};${r.totalReviews};${r.trend.toFixed(1)}%`), '',
    'RESUMEN', `Facturación Total;${data.summary.totalBilling}`, `Reembolsos Totales;${data.summary.totalRefunds}`, '',
    'TIPOS DE ERROR', 'Tipo;Cantidad;Porcentaje',
    ...data.errorTypes.map((e) => `${e.type};${e.count};${e.percentage.toFixed(1)}%`), '',
    'RESEÑAS', 'Fecha;Canal;Restaurante;Rating;Pedido;Comentario',
    ...data.reviews.map((r) => `${r.date};${r.channel};${r.restaurant};${r.rating};${r.orderNumber};"${r.comment.replace(/"/g, '""')}"`),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `reputacion_${formatDate()}.csv`);
}

export function exportObjectivesTableToCSV(data: ObjectivesTableExportData) {
  const allMonths = data.rows[0]?.months.map((m) => m.month) || [];
  const headers = ['Restaurante', 'Canal', ...allMonths.flatMap((m) => [`${m} Obj.`, `${m} Real`])];
  const rows = data.rows.map((row) => [
    row.restaurantName, row.channel,
    ...row.months.flatMap((m) => [m.revenueTarget || '', m.revenueActual || '']),
  ]);

  const csvContent = [
    `OBJETIVOS DE VENTA - ${data.dateRange}`, '', headers.join(';'),
    ...rows.map((r) => r.join(';')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `objetivos_venta_${formatDate()}.csv`);
}

export function exportAuditToCSV(data: AuditExportData) {
  const rows: Record<string, unknown>[] = [];
  data.sections.forEach((section) => {
    section.fields.forEach((field) => {
      rows.push({
        seccion: section.title, campo: field.label, tipo: field.type, valor: formatFieldValue(field),
      });
    });
  });

  const columns: ExportColumn[] = [
    { header: 'Sección', key: 'seccion' },
    { header: 'Campo', key: 'campo' },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Valor', key: 'valor' },
  ];

  exportToCSV(rows, `auditoria_${data.auditNumber}`, columns);
}

// ============================================
// EXCEL EXPORT (Async - Dynamic Import)
// ============================================

export async function exportSalesProjectionToExcel(data: SalesProjectionExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();

  const revenueData: (string | number)[][] = [['FACTURACIÓN', '', ...data.months.map(m => m.label), 'TOTAL']];
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.targetRevenue[m.key]?.[ch] || 0), 0);
    revenueData.push(['Objetivo', ch, ...data.months.map(m => data.targetRevenue[m.key]?.[ch] || 0), total]);
  });
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.actualRevenue[m.key]?.[ch] || 0), 0);
    revenueData.push(['Real', ch, ...data.months.map(m => data.actualRevenue[m.key]?.[ch] || 0), total]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueData), 'Facturación');

  const adsData: (string | number)[][] = [['ADS', '', ...data.months.map(m => m.label), 'TOTAL']];
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.targetAds[m.key]?.[ch] || 0), 0);
    adsData.push(['Objetivo', ch, ...data.months.map(m => data.targetAds[m.key]?.[ch] || 0), total]);
  });
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.actualAds[m.key]?.[ch] || 0), 0);
    adsData.push(['Real', ch, ...data.months.map(m => data.actualAds[m.key]?.[ch] || 0), total]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(adsData), 'ADS');

  const promosData: (string | number)[][] = [['PROMOS', '', ...data.months.map(m => m.label), 'TOTAL']];
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.targetPromos[m.key]?.[ch] || 0), 0);
    promosData.push(['Objetivo', ch, ...data.months.map(m => data.targetPromos[m.key]?.[ch] || 0), total]);
  });
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.actualPromos[m.key]?.[ch] || 0), 0);
    promosData.push(['Real', ch, ...data.months.map(m => data.actualPromos[m.key]?.[ch] || 0), total]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(promosData), 'Promos');

  const grandTargetRevenue = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.targetRevenue[m.key]?.[ch] || 0), 0), 0);
  const grandActualRevenue = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.actualRevenue[m.key]?.[ch] || 0), 0), 0);
  const grandTargetAds = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.targetAds[m.key]?.[ch] || 0), 0), 0);
  const grandActualAds = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.actualAds[m.key]?.[ch] || 0), 0), 0);
  const grandTargetPromos = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.targetPromos[m.key]?.[ch] || 0), 0), 0);
  const grandActualPromos = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.actualPromos[m.key]?.[ch] || 0), 0), 0);

  const summaryData: (string | number)[][] = [
    ['RESUMEN PROYECCIÓN DE VENTAS'], [''], ['Período', data.dateRange], ['Canales', data.channels.join(', ')], [''],
    ['Métrica', 'Objetivo', 'Real', 'Diferencia', '% Cumplimiento'],
    ['Facturación', grandTargetRevenue, grandActualRevenue, grandActualRevenue - grandTargetRevenue, grandTargetRevenue > 0 ? `${((grandActualRevenue / grandTargetRevenue) * 100).toFixed(1)}%` : '-'],
    ['ADS', grandTargetAds, grandActualAds, grandActualAds - grandTargetAds, grandTargetAds > 0 ? `${((grandActualAds / grandTargetAds) * 100).toFixed(1)}%` : '-'],
    ['Promos', grandTargetPromos, grandActualPromos, grandActualPromos - grandTargetPromos, grandTargetPromos > 0 ? `${((grandActualPromos / grandTargetPromos) * 100).toFixed(1)}%` : '-'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `proyeccion_ventas_${formatDate()}.xlsx`);
}

export async function exportObjectivesToExcel(objectives: ObjectiveExportData[], restaurantName: string): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();

  const objData: (string | number)[][] = [
    ['OBJETIVOS ESTRATÉGICOS - ' + restaurantName],
    ['Generado: ' + new Date().toLocaleDateString('es-ES')], [''],
    ['Título', 'Categoría', 'Estado', 'Responsable', 'Fecha Límite', 'Días Restantes', 'KPI Actual', 'KPI Objetivo', 'Unidad', 'Progreso']
  ];
  objectives.forEach(obj => {
    objData.push([obj.title, obj.category, obj.status, obj.responsible, obj.deadline, obj.daysRemaining, obj.kpiCurrent || '', obj.kpiTarget || '', obj.kpiUnit || '', obj.progress ? `${obj.progress}%` : '']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(objData), 'Objetivos');

  const allTasks: (string | number)[][] = [['TAREAS'], [''], ['Objetivo', 'Tarea', 'Responsable', 'Fecha Límite', 'Estado']];
  objectives.forEach(obj => {
    obj.tasks?.forEach(task => {
      allTasks.push([obj.title, task.title, task.responsible, task.deadline, task.isCompleted ? 'Completada' : 'Pendiente']);
    });
  });
  if (allTasks.length > 3) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allTasks), 'Tareas');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `objetivos_${restaurantName}_${formatDate()}.xlsx`);
}

export async function exportControllingToExcel(data: ControllingExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();

  const portfolioData: (string | number)[][] = [
    ['RESUMEN CARTERA', data.dateRange], [''], ['Métrica', 'Valor', 'Variación %'],
    ['Ventas', data.portfolio.ventas, data.portfolio.ventasChange],
    ['Pedidos', data.portfolio.pedidos, data.portfolio.pedidosChange],
    ['Ticket Medio', data.portfolio.ticketMedio, data.portfolio.ticketMedioChange],
    ['Open Time (%)', data.portfolio.openTime, data.portfolio.openTimeChange],
    ['Inversión Ads', data.portfolio.inversionAds, data.portfolio.inversionAdsChange],
    ['Inversión Promos', data.portfolio.inversionPromos, data.portfolio.inversionPromosChange],
    ['Reembolsos', data.portfolio.reembolsos, data.portfolio.reembolsosChange],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(portfolioData), 'Resumen');

  const channelsData: (string | number)[][] = [
    ['RENDIMIENTO POR CANAL'], [''],
    ['Canal', 'Ventas', 'Var. %', '% Total', 'Pedidos', 'Ticket', 'Open Time', 'Ads', 'Ads %', 'Promos', 'Promos %', 'Reembolsos', 'Reemb. %'],
    ...data.channels.map((ch) => [ch.name, ch.revenue, ch.revenueChange, ch.percentage, ch.pedidos, ch.ticketMedio, ch.openTime, ch.ads, ch.adsPercentage, ch.promos, ch.promosPercentage, ch.reembolsos, ch.reembolsosPercentage])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(channelsData), 'Canales');

  const hierarchyData: (string | number)[][] = [
    ['DETALLE JERARQUÍA'], [''],
    ['Nombre', 'Nivel', 'Ventas', 'Var. %', 'Pedidos', 'Ticket', 'Nuevos', '% Nuevos', 'Open Time', 'Conversión', 'T. Espera', 'Rating', 'Ads', 'Ads %', 'ROAS', 'Promos', 'Promos %', 'ROAS P.'],
    ...data.hierarchy.map((row) => [row.name, row.level, row.ventas, row.ventasChange, row.pedidos, row.ticketMedio, row.nuevosClientes, row.porcentajeNuevos, row.openTime, row.ratioConversion, row.tiempoEspera, row.valoraciones, row.inversionAds, row.adsPercentage, row.roas, row.inversionPromos, row.promosPercentage, row.promosRoas])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hierarchyData), 'Detalle');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `controlling_${formatDate()}.xlsx`);
}

export async function exportReputationToExcel(data: ReputationExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();

  const summaryData: (string | number)[][] = [
    ['REPUTACIÓN', data.dateRange], [''], ['RATINGS POR CANAL'],
    ['Canal', 'Rating', 'Reviews', 'Tendencia %'],
    ...data.channelRatings.map((r) => [r.channel, r.rating, r.totalReviews, r.trend]), [''],
    ['RESUMEN'], ['Facturación Total', data.summary.totalBilling], ['Reembolsos Totales', data.summary.totalRefunds],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');

  const errorsData: (string | number)[][] = [['TIPOS DE ERROR'], [''], ['Tipo', 'Cantidad', 'Porcentaje'], ...data.errorTypes.map((e) => [e.type, e.count, e.percentage])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(errorsData), 'Errores');

  const reviewsData: (string | number)[][] = [['RESEÑAS'], [''], ['Fecha', 'Canal', 'Restaurante', 'Rating', 'Pedido', 'Comentario'], ...data.reviews.map((r) => [r.date, r.channel, r.restaurant, r.rating, r.orderNumber, r.comment])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reviewsData), 'Reseñas');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `reputacion_${formatDate()}.xlsx`);
}

export async function exportObjectivesTableToExcel(data: ObjectivesTableExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();
  const allMonths = data.rows[0]?.months.map((m) => m.month) || [];

  const revenueData: (string | number)[][] = [
    ['OBJETIVOS DE FACTURACIÓN', data.dateRange], [''],
    ['Restaurante', 'Canal', ...allMonths.flatMap((m) => [`${m} Obj.`, `${m} Real`, `${m} %`])],
    ...data.rows.map((row) => [row.restaurantName, row.channel, ...row.months.flatMap((m) => {
      const target = m.revenueTarget || 0;
      const actual = m.revenueActual || 0;
      return [target, actual, target > 0 ? ((actual / target) * 100).toFixed(1) + '%' : '-'];
    })]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueData), 'Facturación');

  const adsData: (string | number)[][] = [
    ['OBJETIVOS ADS', data.dateRange], [''],
    ['Restaurante', 'Canal', ...allMonths.flatMap((m) => [`${m} Obj.`, `${m} Real`])],
    ...data.rows.map((row) => [row.restaurantName, row.channel, ...row.months.flatMap((m) => [m.adsTarget || '', m.adsActual || ''])]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(adsData), 'ADS');

  const promosData: (string | number)[][] = [
    ['OBJETIVOS PROMOS', data.dateRange], [''],
    ['Restaurante', 'Canal', ...allMonths.flatMap((m) => [`${m} Obj.`, `${m} Real`])],
    ...data.rows.map((row) => [row.restaurantName, row.channel, ...row.months.flatMap((m) => [m.promosTarget || '', m.promosActual || ''])]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(promosData), 'Promos');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `objetivos_venta_${formatDate()}.xlsx`);
}

export async function exportAuditToExcel(data: AuditExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();

  const summaryData: (string | number)[][] = [
    ['AUDITORÍA - ' + data.auditNumber], [''],
    ['Tipo', data.auditType], ['Alcance', data.scope], ['Estado', data.status],
    ['Realizado por', data.createdBy], ['Fecha', data.completedAt || data.createdAt], [''],
  ];
  if (data.totalScore && data.totalScore.maximum > 0) {
    summaryData.push(['PUNTUACIÓN TOTAL'], ['Obtenido', data.totalScore.obtained], ['Máximo', data.totalScore.maximum], ['Porcentaje', `${data.totalScore.percentage}%`], ['']);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');

  const detailData: (string | number)[][] = [['DETALLE DE AUDITORÍA'], [''], ['Sección', 'Campo', 'Valor']];
  data.sections.forEach((section) => {
    section.fields.forEach((field) => { detailData.push([section.title, field.label, formatFieldValue(field)]); });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailData), 'Detalle');

  data.sections.forEach((section, index) => {
    const sectionData: (string | number)[][] = [[section.title.toUpperCase()], [''], ['Campo', 'Valor'], ...section.fields.map((field) => [field.label, formatFieldValue(field)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sectionData), `${index + 1}. ${section.title}`.substring(0, 31));
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `auditoria_${data.auditNumber}_${formatDate()}.xlsx`);
}

// ============================================
// PDF EXPORT (Async - Dynamic Import)
// ============================================

export async function exportSalesProjectionToPDF(data: SalesProjectionExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Proyección de Ventas', `${data.title} · ${data.dateRange}`);

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.gray);
  doc.text(`Canales: ${data.channels.join(', ')}`, 14, startY + 2);

  const grandTargetRevenue = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.targetRevenue[m.key]?.[ch] || 0), 0), 0);
  const grandActualRevenue = data.months.reduce((sum, m) => sum + data.channels.reduce((chSum, ch) => chSum + (data.actualRevenue[m.key]?.[ch] || 0), 0), 0);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen', 14, startY + 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Facturación Objetivo: ${formatNumber(grandTargetRevenue)}€`, 14, startY + 22);
  doc.text(`Facturación Real: ${formatNumber(grandActualRevenue)}€`, 14, startY + 28);
  if (grandTargetRevenue > 0) {
    doc.text(`Cumplimiento: ${((grandActualRevenue / grandTargetRevenue) * 100).toFixed(1)}%`, 14, startY + 34);
  }

  const tableHeaders = ['Canal', ...data.months.map(m => m.label), 'Total'];
  const revenueRows: (string | number)[][] = [];
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.targetRevenue[m.key]?.[ch] || 0), 0);
    revenueRows.push([`${ch} (obj)`, ...data.months.map(m => formatNumber(data.targetRevenue[m.key]?.[ch] || 0)), formatNumber(total)]);
  });
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.actualRevenue[m.key]?.[ch] || 0), 0);
    revenueRows.push([`${ch} (real)`, ...data.months.map(m => formatNumber(data.actualRevenue[m.key]?.[ch] || 0)), formatNumber(total)]);
  });

  autoTable(doc, { startY: startY + 44, head: [tableHeaders], body: revenueRows, ...BRANDED_TABLE_STYLES, columnStyles: { 0: { fontStyle: 'bold' } } });
  addBrandedFooter(doc);
  doc.save(`proyeccion_ventas_${formatDate()}.pdf`);
}

export async function exportObjectivesToPDF(objectives: ObjectiveExportData[], restaurantName: string): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Objetivos Estratégicos', restaurantName);

  const byStatus = {
    pending: objectives.filter(o => o.status === 'pending' || o.status === 'Pendiente').length,
    in_progress: objectives.filter(o => o.status === 'in_progress' || o.status === 'En progreso').length,
    completed: objectives.filter(o => o.status === 'completed' || o.status === 'Completado').length,
  };

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.gray);
  doc.text(`Total: ${objectives.length} objetivos · Pendientes: ${byStatus.pending} · En progreso: ${byStatus.in_progress} · Completados: ${byStatus.completed}`, 14, startY + 2);

  const tableData = objectives.map(obj => [
    obj.title.substring(0, 35) + (obj.title.length > 35 ? '...' : ''),
    obj.category, obj.status, obj.responsible, obj.deadline,
    obj.daysRemaining > 0 ? `${obj.daysRemaining}d` : 'Vencido',
    obj.progress ? `${obj.progress}%` : '-'
  ]);

  autoTable(doc, {
    startY: startY + 10,
    head: [['Objetivo', 'Categoría', 'Estado', 'Resp.', 'Fecha', 'Días', 'Progreso']],
    body: tableData,
    ...BRANDED_TABLE_STYLES,
    bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 7 },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 25 }, 2: { cellWidth: 22 }, 3: { cellWidth: 20 }, 4: { cellWidth: 22 }, 5: { cellWidth: 15 }, 6: { cellWidth: 18 } },
  });

  const objectivesWithTasks = objectives.filter(o => o.tasks?.length);
  if (objectivesWithTasks.length > 0) {
    doc.addPage();
    let yPos = addBrandedHeader(doc, 'Tareas por Objetivo', `${objectivesWithTasks.length} objetivos con tareas`);

    objectivesWithTasks.forEach(obj => {
      if (yPos > 250) { doc.addPage(); yPos = addBrandedHeader(doc, 'Tareas por Objetivo', 'Continuación'); }
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.colors.dark);
      doc.setFont('helvetica', 'bold');
      doc.text(obj.title.substring(0, 60), 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.colors.gray);
      obj.tasks?.forEach(task => {
        doc.text(`${task.isCompleted ? '✓' : '○'} ${task.title} - ${task.responsible} (${task.deadline})`, 18, yPos);
        yPos += 5;
      });
      yPos += 4;
    });
  }

  addBrandedFooter(doc);
  doc.save(`objetivos_${restaurantName}_${formatDate()}.pdf`);
}

export async function exportControllingToPDF(data: ControllingExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Controlling', data.dateRange);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Cartera', 14, startY + 4);

  autoTable(doc, {
    startY: startY + 8,
    head: [['Métrica', 'Valor', 'Variación']],
    body: [
      ['Ventas', formatNumber(data.portfolio.ventas) + '€', `${data.portfolio.ventasChange >= 0 ? '+' : ''}${data.portfolio.ventasChange.toFixed(1)}%`],
      ['Pedidos', formatNumber(data.portfolio.pedidos), `${data.portfolio.pedidosChange >= 0 ? '+' : ''}${data.portfolio.pedidosChange.toFixed(1)}%`],
      ['Ticket Medio', `${data.portfolio.ticketMedio.toFixed(2)}€`, `${data.portfolio.ticketMedioChange >= 0 ? '+' : ''}${data.portfolio.ticketMedioChange.toFixed(1)}%`],
      ['Open Time', `${data.portfolio.openTime.toFixed(1)}%`, `${data.portfolio.openTimeChange >= 0 ? '+' : ''}${data.portfolio.openTimeChange.toFixed(1)}%`],
      ['Inversión Ads', formatNumber(data.portfolio.inversionAds) + '€', `${data.portfolio.inversionAdsChange >= 0 ? '+' : ''}${data.portfolio.inversionAdsChange.toFixed(1)}%`],
      ['Inversión Promos', formatNumber(data.portfolio.inversionPromos) + '€', `${data.portfolio.inversionPromosChange >= 0 ? '+' : ''}${data.portfolio.inversionPromosChange.toFixed(1)}%`],
      ['Reembolsos', formatNumber(data.portfolio.reembolsos) + '€', `${data.portfolio.reembolsosChange >= 0 ? '+' : ''}${data.portfolio.reembolsosChange.toFixed(1)}%`],
    ],
    ...BRANDED_TABLE_STYLES,
  });

  const channelY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Rendimiento por Canal', 14, channelY);

  autoTable(doc, {
    startY: channelY + 4,
    head: [['Canal', 'Ventas', 'Var.', '% Total', 'Pedidos', 'Ticket', 'Ads', 'Promos']],
    body: data.channels.map((ch) => [
      ch.name, formatNumber(ch.revenue) + '€', `${ch.revenueChange >= 0 ? '+' : ''}${ch.revenueChange.toFixed(1)}%`,
      `${ch.percentage.toFixed(1)}%`, formatNumber(ch.pedidos), `${ch.ticketMedio.toFixed(2)}€`,
      formatNumber(ch.ads) + '€', formatNumber(ch.promos) + '€',
    ]),
    ...BRANDED_TABLE_STYLES,
  });

  addBrandedFooter(doc);
  doc.save(`controlling_${formatDate()}.pdf`);
}

export async function exportReputationToPDF(data: ReputationExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Reputación', data.dateRange);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Ratings por Canal', 14, startY + 4);

  autoTable(doc, {
    startY: startY + 8,
    head: [['Canal', 'Rating', 'Reviews', 'Tendencia']],
    body: data.channelRatings.map((r) => [r.channel, r.rating.toFixed(1), formatNumber(r.totalReviews), `${r.trend >= 0 ? '+' : ''}${r.trend.toFixed(1)}%`]),
    ...BRANDED_TABLE_STYLES,
  });

  const summaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen', 14, summaryY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.gray);
  doc.text(`Facturación Total: ${formatNumber(data.summary.totalBilling)}€`, 14, summaryY + 8);
  doc.text(`Reembolsos Totales: ${formatNumber(data.summary.totalRefunds)}€`, 14, summaryY + 14);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Tipos de Error', 14, summaryY + 26);

  autoTable(doc, {
    startY: summaryY + 30,
    head: [['Tipo', 'Cantidad', '%']],
    body: data.errorTypes.map((e) => [e.type, e.count, `${e.percentage.toFixed(1)}%`]),
    ...BRANDED_TABLE_STYLES,
  });

  doc.addPage();
  const reviewsStartY = addBrandedHeader(doc, 'Reseñas', `${data.reviews.length} registros`);

  autoTable(doc, {
    startY: reviewsStartY,
    head: [['Fecha', 'Canal', 'Productos', 'Rating', 'Comentario']],
    body: data.reviews.slice(0, 50).map((r) => [r.date, r.channel, r.restaurant.substring(0, 25), r.rating.toString(), r.comment.substring(0, 50) + (r.comment.length > 50 ? '...' : '')]),
    ...BRANDED_TABLE_STYLES,
    bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 7 },
  });

  addBrandedFooter(doc);
  doc.save(`reputacion_${formatDate()}.pdf`);
}

export async function exportObjectivesTableToPDF(data: ObjectivesTableExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF('landscape');
  const allMonths = data.rows[0]?.months.map((m) => m.month) || [];

  const startY = addBrandedHeader(doc, 'Objetivos de Venta', data.dateRange);

  const monthLabels = allMonths.map((m) => {
    const d = new Date(m);
    return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  });

  autoTable(doc, {
    startY: startY,
    head: [['Restaurante', 'Canal', ...monthLabels]],
    body: data.rows.map((row) => [
      row.restaurantName.substring(0, 30),
      row.channel === 'glovo' ? 'Glovo' : row.channel === 'ubereats' ? 'Uber Eats' : 'Just Eat',
      ...row.months.map((m) => m.revenueTarget ? `${(m.revenueTarget / 1000).toFixed(1)}k€` : '-'),
    ]),
    ...BRANDED_TABLE_STYLES,
    bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 7 },
    headStyles: { ...BRANDED_TABLE_STYLES.headStyles, fontSize: 7 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 22 } },
  });

  addBrandedFooter(doc);
  doc.save(`objetivos_venta_${formatDate()}.pdf`);
}

export async function exportAuditToPDF(data: AuditExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const subtitle = `${data.scope} · ${data.status}`;
  let yPos = addBrandedHeader(doc, data.auditType, subtitle);

  doc.setFontSize(10);
  doc.setTextColor(...BRAND.colors.gray);
  doc.text(`Referencia: ${data.auditNumber}`, 14, yPos + 2);
  doc.text(`Realizado por: ${data.createdBy}`, 14, yPos + 8);
  doc.text(`Fecha: ${data.completedAt ? new Date(data.completedAt).toLocaleDateString('es-ES') : new Date(data.createdAt).toLocaleDateString('es-ES')}`, 14, yPos + 14);

  if (data.totalScore && data.totalScore.maximum > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(`Puntuación Total: ${data.totalScore.obtained}/${data.totalScore.maximum} (${data.totalScore.percentage}%)`, doc.internal.pageSize.getWidth() - 14, yPos + 8, { align: 'right' });
  }

  yPos += 24;

  data.sections.forEach((section) => {
    if (yPos > 250) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setTextColor(...BRAND.colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 14, yPos);
    yPos += 6;

    const tableData = section.fields.map((field) => [field.label, formatFieldValue(field)]);

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Campo', 'Valor']],
        body: tableData,
        ...BRANDED_TABLE_STYLES,
        bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 8 },
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { cellWidth: 100 } },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
  });

  addBrandedFooter(doc);
  doc.save(`auditoria_${data.auditNumber}_${formatDate()}.pdf`);
}

// ============================================
// PDF BLOB GENERATORS (for preview)
// ============================================

export async function generateControllingPdfBlob(data: ControllingExportData): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Controlling', data.dateRange);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Cartera', 14, startY + 4);

  autoTable(doc, {
    startY: startY + 8,
    head: [['Métrica', 'Valor', 'Variación']],
    body: [
      ['Ventas', formatNumber(data.portfolio.ventas) + '€', `${data.portfolio.ventasChange >= 0 ? '+' : ''}${data.portfolio.ventasChange.toFixed(1)}%`],
      ['Pedidos', formatNumber(data.portfolio.pedidos), `${data.portfolio.pedidosChange >= 0 ? '+' : ''}${data.portfolio.pedidosChange.toFixed(1)}%`],
      ['Ticket Medio', `${data.portfolio.ticketMedio.toFixed(2)}€`, `${data.portfolio.ticketMedioChange >= 0 ? '+' : ''}${data.portfolio.ticketMedioChange.toFixed(1)}%`],
    ],
    ...BRANDED_TABLE_STYLES,
  });

  addBrandedFooter(doc);
  return doc.output('blob');
}

export async function generateReputationPdfBlob(data: ReputationExportData): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Reputación', data.dateRange);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Canal', 'Rating', 'Reviews', 'Tendencia']],
    body: data.channelRatings.map((r) => [r.channel, r.rating.toFixed(1), formatNumber(r.totalReviews), `${r.trend >= 0 ? '+' : ''}${r.trend.toFixed(1)}%`]),
    ...BRANDED_TABLE_STYLES,
  });

  addBrandedFooter(doc);
  return doc.output('blob');
}

export async function generateObjectivesPdfBlob(data: ObjectivesTableExportData): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF('landscape');
  const allMonths = data.rows[0]?.months.map((m) => m.month) || [];

  const startY = addBrandedHeader(doc, 'Objetivos de Venta', data.dateRange);
  const monthLabels = allMonths.map((m) => new Date(m).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));

  autoTable(doc, {
    startY: startY,
    head: [['Restaurante', 'Canal', ...monthLabels]],
    body: data.rows.slice(0, 10).map((row) => [
      row.restaurantName.substring(0, 30),
      row.channel === 'glovo' ? 'Glovo' : row.channel === 'ubereats' ? 'Uber Eats' : 'Just Eat',
      ...row.months.map((m) => m.revenueTarget ? `${(m.revenueTarget / 1000).toFixed(1)}k€` : '-'),
    ]),
    ...BRANDED_TABLE_STYLES,
    bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 7 },
  });

  addBrandedFooter(doc);
  return doc.output('blob');
}

export async function generateAuditPdfBlob(data: AuditExportData): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  let yPos = addBrandedHeader(doc, data.auditType, `${data.scope} · ${data.status}`);

  doc.setFontSize(10);
  doc.setTextColor(...BRAND.colors.gray);
  doc.text(`Referencia: ${data.auditNumber}`, 14, yPos + 2);

  if (data.totalScore && data.totalScore.maximum > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(`Puntuación: ${data.totalScore.obtained}/${data.totalScore.maximum} (${data.totalScore.percentage}%)`, doc.internal.pageSize.getWidth() - 14, yPos + 2, { align: 'right' });
  }

  yPos += 16;

  // Only show first section for preview
  const section = data.sections[0];
  if (section) {
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 14, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Campo', 'Valor']],
      body: section.fields.slice(0, 5).map((field) => [field.label, formatFieldValue(field)]),
      ...BRANDED_TABLE_STYLES,
      bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 8 },
    });
  }

  addBrandedFooter(doc);
  return doc.output('blob');
}
