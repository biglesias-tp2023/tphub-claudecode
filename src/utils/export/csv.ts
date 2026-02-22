/**
 * CSV export functions.
 * No external dependencies required.
 *
 * @module utils/export/csv
 */

import type {
  ExportColumn,
  SalesProjectionExportData,
  ObjectiveExportData,
  ControllingExportData,
  ReputationExportData,
  ObjectivesTableExportData,
  AuditExportData,
} from './types';
import { formatDate, downloadBlob, formatFieldValue } from './helpers';

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
    { header: 'Titulo', key: 'titulo' },
    { header: 'Categoria', key: 'categoria' },
    { header: 'Estado', key: 'estado' },
    { header: 'Responsable', key: 'responsable' },
    { header: 'Fecha Limite', key: 'fecha_limite' },
    { header: 'Dias Restantes', key: 'dias_restantes' },
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
    { metrica: 'Inversion Ads', valor: data.portfolio.inversionAds, variacion: `${data.portfolio.inversionAdsChange.toFixed(1)}%` },
    { metrica: 'Inversion Promos', valor: data.portfolio.inversionPromos, variacion: `${data.portfolio.inversionPromosChange.toFixed(1)}%` },
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
    'RESUMEN CARTERA', 'Metrica;Valor;Variacion',
    ...portfolioRows.map((r) => `${r.metrica};${r.valor};${r.variacion}`), '',
    'RENDIMIENTO POR CANAL', 'Canal;Ventas;Variacion;% Total;Pedidos;Ticket;Open Time;Ads;Ads %;Promos;Promos %',
    ...channelRows.map((r) => `${r.canal};${r.ventas};${r.variacion};${r.porcentaje};${r.pedidos};${r.ticket_medio};${r.open_time};${r.ads};${r.ads_pct};${r.promos};${r.promos_pct}`), '',
    'DETALLE JERARQUIA', 'Nombre;Nivel;Ventas;Var.;Pedidos;Ticket;Nuevos;% Nuevos;Open;Conv.;T.Espera;Rating;Ads;Ads %;ROAS;Promos;Promos %',
    ...hierarchyRows.map((r) => `${r.nombre};${r.nivel};${r.ventas};${r.variacion};${r.pedidos};${r.ticket_medio};${r.nuevos_clientes};${r.pct_nuevos};${r.open_time};${r.conversion};${r.t_espera};${r.rating};${r.ads};${r.ads_pct};${r.roas};${r.promos};${r.promos_pct}`),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `controlling_${formatDate()}.csv`);
}

export function exportReputationToCSV(data: ReputationExportData) {
  const csvContent = [
    `REPUTACION - ${data.dateRange}`, '',
    'RATINGS POR CANAL', 'Canal;Rating;Reviews;% Positivo;% Negativo',
    ...data.channelRatings.map((r) => `${r.channel};${r.rating.toFixed(1)};${r.totalReviews};${r.positivePercent.toFixed(1)}%;${r.negativePercent.toFixed(1)}%`), '',
    'RESUMEN', `Total Resenas;${data.summary.totalReviews}`, `Resenas Negativas;${data.summary.negativeReviews}`,
    ...(data.summary.totalRefunds != null ? [`Reembolsos;${data.summary.totalRefunds.toFixed(2)} EUR`, `Tasa Reembolso;${(data.summary.refundRate ?? 0).toFixed(1)}%`] : []),
    '',
    'DISTRIBUCION DE VALORACIONES', 'Rating;Cantidad;Porcentaje',
    ...data.ratingDistribution.map((r) => `${r.rating} estrellas;${r.count};${r.percentage.toFixed(1)}%`), '',
    'RESENAS', 'Fecha;Hora;Canal;Review ID;Order ID;Rating;Comentario;Tags;T. Entrega (min);Reembolso (EUR)',
    ...data.reviews.map((r) => `${r.date};${r.time};${r.channel};${r.id};${r.orderId};${r.rating};${r.comment ?? ''};${r.tags?.join(', ') ?? ''};${r.deliveryTime ?? ''};${r.refundAmount != null ? r.refundAmount.toFixed(2) : ''}`),
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
    { header: 'Seccion', key: 'seccion' },
    { header: 'Campo', key: 'campo' },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Valor', key: 'valor' },
  ];

  exportToCSV(rows, `auditoria_${data.auditNumber}`, columns);
}
