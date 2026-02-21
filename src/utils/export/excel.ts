/**
 * Excel export functions.
 * Uses dynamic XLSX import for bundle optimization.
 *
 * @module utils/export/excel
 */

import type {
  SalesProjectionExportData,
  ObjectiveExportData,
  ControllingExportData,
  ReputationExportData,
  ObjectivesTableExportData,
} from './types';
import { formatDate, downloadBlob } from './helpers';
import { loadXlsxLibrary } from './brand';

export async function exportSalesProjectionToExcel(data: SalesProjectionExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();

  const revenueData: (string | number)[][] = [['FACTURACION', '', ...data.months.map(m => m.label), 'TOTAL']];
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.targetRevenue[m.key]?.[ch] || 0), 0);
    revenueData.push(['Objetivo', ch, ...data.months.map(m => data.targetRevenue[m.key]?.[ch] || 0), total]);
  });
  data.channels.forEach(ch => {
    const total = data.months.reduce((sum, m) => sum + (data.actualRevenue[m.key]?.[ch] || 0), 0);
    revenueData.push(['Real', ch, ...data.months.map(m => data.actualRevenue[m.key]?.[ch] || 0), total]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueData), 'Facturacion');

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
    ['RESUMEN PROYECCION DE VENTAS'], [''], ['Periodo', data.dateRange], ['Canales', data.channels.join(', ')], [''],
    ['Metrica', 'Objetivo', 'Real', 'Diferencia', '% Cumplimiento'],
    ['Facturacion', grandTargetRevenue, grandActualRevenue, grandActualRevenue - grandTargetRevenue, grandTargetRevenue > 0 ? `${((grandActualRevenue / grandTargetRevenue) * 100).toFixed(1)}%` : '-'],
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
    ['OBJETIVOS ESTRATEGICOS - ' + restaurantName],
    ['Generado: ' + new Date().toLocaleDateString('es-ES')], [''],
    ['Titulo', 'Categoria', 'Estado', 'Responsable', 'Fecha Limite', 'Dias Restantes', 'KPI Actual', 'KPI Objetivo', 'Unidad', 'Progreso']
  ];
  objectives.forEach(obj => {
    objData.push([obj.title, obj.category, obj.status, obj.responsible, obj.deadline, obj.daysRemaining, obj.kpiCurrent || '', obj.kpiTarget || '', obj.kpiUnit || '', obj.progress ? `${obj.progress}%` : '']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(objData), 'Objetivos');

  const allTasks: (string | number)[][] = [['TAREAS'], [''], ['Objetivo', 'Tarea', 'Responsable', 'Fecha Limite', 'Estado']];
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
    ['RESUMEN CARTERA', data.dateRange], [''], ['Metrica', 'Valor', 'Variacion %'],
    ['Ventas', data.portfolio.ventas, data.portfolio.ventasChange],
    ['Pedidos', data.portfolio.pedidos, data.portfolio.pedidosChange],
    ['Ticket Medio', data.portfolio.ticketMedio, data.portfolio.ticketMedioChange],
    ['Open Time (%)', data.portfolio.openTime, data.portfolio.openTimeChange],
    ['Inversion Ads', data.portfolio.inversionAds, data.portfolio.inversionAdsChange],
    ['Inversion Promos', data.portfolio.inversionPromos, data.portfolio.inversionPromosChange],
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
    ['DETALLE JERARQUIA'], [''],
    ['Nombre', 'Nivel', 'Ventas', 'Var. %', 'Pedidos', 'Ticket', 'Nuevos', '% Nuevos', 'Open Time', 'Conversion', 'T. Espera', 'Rating', 'Ads', 'Ads %', 'ROAS', 'Promos', 'Promos %', 'ROAS P.'],
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
    ['REPUTACION', data.dateRange], [''], ['RATINGS POR CANAL'],
    ['Canal', 'Rating', 'Reviews', '% Positivo', '% Negativo'],
    ...data.channelRatings.map((r) => [r.channel, r.rating, r.totalReviews, r.positivePercent, r.negativePercent]), [''],
    ['RESUMEN'], ['Total Resenas', data.summary.totalReviews], ['Resenas Negativas', data.summary.negativeReviews],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');

  const ratingsData: (string | number)[][] = [['DISTRIBUCION DE VALORACIONES'], [''], ['Rating', 'Cantidad', 'Porcentaje'], ...data.ratingDistribution.map((r) => [`${r.rating} estrellas`, r.count, r.percentage])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ratingsData), 'Valoraciones');

  const reviewsData: (string | number)[][] = [['RESENAS'], [''], ['Fecha', 'Hora', 'Canal', 'Review ID', 'Order ID', 'Rating'], ...data.reviews.map((r) => [r.date, r.time, r.channel, r.id, r.orderId, r.rating])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reviewsData), 'Resenas');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), `reputacion_${formatDate()}.xlsx`);
}

export async function exportObjectivesTableToExcel(data: ObjectivesTableExportData): Promise<void> {
  const XLSX = await loadXlsxLibrary();
  const wb = XLSX.utils.book_new();
  const allMonths = data.rows[0]?.months.map((m) => m.month) || [];

  const revenueData: (string | number)[][] = [
    ['OBJETIVOS DE FACTURACION', data.dateRange], [''],
    ['Restaurante', 'Canal', ...allMonths.flatMap((m) => [`${m} Obj.`, `${m} Real`, `${m} %`])],
    ...data.rows.map((row) => [row.restaurantName, row.channel, ...row.months.flatMap((m) => {
      const target = m.revenueTarget || 0;
      const actual = m.revenueActual || 0;
      return [target, actual, target > 0 ? ((actual / target) * 100).toFixed(1) + '%' : '-'];
    })]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueData), 'Facturacion');

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
