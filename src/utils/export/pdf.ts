/**
 * PDF export functions and blob generators.
 * Uses dynamic jsPDF + autoTable imports for bundle optimization.
 *
 * @module utils/export/pdf
 */

import type { jsPDF } from 'jspdf';
import type {
  SalesProjectionExportData,
  ObjectiveExportData,
  ControllingExportData,
  ReputationExportData,
  ObjectivesTableExportData,
  AuditExportData,
  AuditExportField,
} from './types';
import { formatDate, formatNumber, formatFieldValue } from './helpers';
import { loadPdfLibraries, loadLogoImage, BRAND, addBrandedHeader, addBrandedFooter, BRANDED_TABLE_STYLES } from './brand';

// ============================================
// PDF EXPORT
// ============================================

export async function exportSalesProjectionToPDF(data: SalesProjectionExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Proyeccion de Ventas', `${data.title} · ${data.dateRange}`);

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
  doc.text(`Facturacion Objetivo: ${formatNumber(grandTargetRevenue)}€`, 14, startY + 22);
  doc.text(`Facturacion Real: ${formatNumber(grandActualRevenue)}€`, 14, startY + 28);
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

  const startY = addBrandedHeader(doc, 'Objetivos Estrategicos', restaurantName);

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
    head: [['Objetivo', 'Categoria', 'Estado', 'Resp.', 'Fecha', 'Dias', 'Progreso']],
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
      if (yPos > 250) { doc.addPage(); yPos = addBrandedHeader(doc, 'Tareas por Objetivo', 'Continuacion'); }
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.colors.dark);
      doc.setFont('helvetica', 'bold');
      doc.text(obj.title.substring(0, 60), 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.colors.gray);
      obj.tasks?.forEach(task => {
        doc.text(`${task.isCompleted ? '\u2713' : '\u25CB'} ${task.title} - ${task.responsible} (${task.deadline})`, 18, yPos);
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
    head: [['Metrica', 'Valor', 'Variacion']],
    body: [
      ['Ventas', formatNumber(data.portfolio.ventas) + '\u20AC', `${data.portfolio.ventasChange >= 0 ? '+' : ''}${data.portfolio.ventasChange.toFixed(1)}%`],
      ['Pedidos', formatNumber(data.portfolio.pedidos), `${data.portfolio.pedidosChange >= 0 ? '+' : ''}${data.portfolio.pedidosChange.toFixed(1)}%`],
      ['Ticket Medio', `${data.portfolio.ticketMedio.toFixed(2)}\u20AC`, `${data.portfolio.ticketMedioChange >= 0 ? '+' : ''}${data.portfolio.ticketMedioChange.toFixed(1)}%`],
      ['Open Time', `${data.portfolio.openTime.toFixed(1)}%`, `${data.portfolio.openTimeChange >= 0 ? '+' : ''}${data.portfolio.openTimeChange.toFixed(1)}%`],
      ['Inversion Ads', formatNumber(data.portfolio.inversionAds) + '\u20AC', `${data.portfolio.inversionAdsChange >= 0 ? '+' : ''}${data.portfolio.inversionAdsChange.toFixed(1)}%`],
      ['Inversion Promos', formatNumber(data.portfolio.inversionPromos) + '\u20AC', `${data.portfolio.inversionPromosChange >= 0 ? '+' : ''}${data.portfolio.inversionPromosChange.toFixed(1)}%`],
      ['Reembolsos', formatNumber(data.portfolio.reembolsos) + '\u20AC', `${data.portfolio.reembolsosChange >= 0 ? '+' : ''}${data.portfolio.reembolsosChange.toFixed(1)}%`],
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
      ch.name, formatNumber(ch.revenue) + '\u20AC', `${ch.revenueChange >= 0 ? '+' : ''}${ch.revenueChange.toFixed(1)}%`,
      `${ch.percentage.toFixed(1)}%`, formatNumber(ch.pedidos), `${ch.ticketMedio.toFixed(2)}\u20AC`,
      formatNumber(ch.ads) + '\u20AC', formatNumber(ch.promos) + '\u20AC',
    ]),
    ...BRANDED_TABLE_STYLES,
  });

  addBrandedFooter(doc);
  doc.save(`controlling_${formatDate()}.pdf`);
}

export async function exportReputationToPDF(data: ReputationExportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Reputacion', data.dateRange);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Ratings por Canal', 14, startY + 4);

  autoTable(doc, {
    startY: startY + 8,
    head: [['Canal', 'Rating', 'Reviews', '% Positivo', '% Negativo']],
    body: data.channelRatings.map((r) => [r.channel, r.rating.toFixed(1), formatNumber(r.totalReviews), `${r.positivePercent.toFixed(1)}%`, `${r.negativePercent.toFixed(1)}%`]),
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
  doc.text(`Total Resenas: ${formatNumber(data.summary.totalReviews)}`, 14, summaryY + 8);
  doc.text(`Resenas Negativas: ${formatNumber(data.summary.negativeReviews)}`, 14, summaryY + 14);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribucion de Valoraciones', 14, summaryY + 26);

  autoTable(doc, {
    startY: summaryY + 30,
    head: [['Rating', 'Cantidad', '%']],
    body: data.ratingDistribution.map((r) => [`${r.rating} estrellas`, formatNumber(r.count), `${r.percentage.toFixed(1)}%`]),
    ...BRANDED_TABLE_STYLES,
  });

  doc.addPage();
  const reviewsStartY = addBrandedHeader(doc, 'Resenas', `${data.reviews.length} registros`);

  autoTable(doc, {
    startY: reviewsStartY,
    head: [['Fecha', 'Hora', 'Canal', 'Review ID', 'Order ID', 'Rating']],
    body: data.reviews.slice(0, 50).map((r) => [r.date, r.time, r.channel, r.id.substring(0, 12), r.orderId.substring(0, 12), `${r.rating}★`]),
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
      ...row.months.map((m) => m.revenueTarget ? `${(m.revenueTarget / 1000).toFixed(1)}k\u20AC` : '-'),
    ]),
    ...BRANDED_TABLE_STYLES,
    bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 7 },
    headStyles: { ...BRANDED_TABLE_STYLES.headStyles, fontSize: 7 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 22 } },
  });

  addBrandedFooter(doc);
  doc.save(`objetivos_venta_${formatDate()}.pdf`);
}

/**
 * Determines background color for a select/rating value based on its score prefix.
 * Returns [R,G,B] or null for no background.
 */
function getValueBadgeColor(field: AuditExportField): [number, number, number] | null {
  const { type, value } = field;

  if (type === 'select' && typeof value === 'string') {
    const match = value.match(/^(\d+)\s*[-\u2013]/);
    if (match) {
      const score = parseInt(match[1]);
      if (score <= 2) return [254, 226, 226];   // light red
      if (score === 3) return [254, 243, 199];   // light yellow
      if (score >= 4) return [209, 250, 229];    // light green
    }
    // Select without numeric prefix: light purple
    return [237, 233, 254];
  }

  if ((type === 'multiselect' || type === 'multi_select' || type === 'tag_input') && Array.isArray(value) && value.length > 0) {
    return [219, 234, 254]; // light blue
  }

  if (type === 'rating' && typeof value === 'number') {
    const max = field.maxScore || 10;
    const ratio = value / max;
    if (ratio < 0.4) return [254, 226, 226];
    if (ratio < 0.7) return [254, 243, 199];
    return [209, 250, 229];
  }

  return null;
}

/**
 * Shared builder: creates the audit PDF document with clean question+answer layout.
 */
async function buildAuditPdfDoc(data: AuditExportData): Promise<jsPDF> {
  const [{ jsPDF: JsPDF, autoTable }, logoDataUrl] = await Promise.all([
    loadPdfLibraries(),
    loadLogoImage().catch(() => undefined),
  ]);
  const doc = new JsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const subtitle = `${data.scope} · ${data.status}`;
  let yPos = addBrandedHeader(doc, data.auditType, subtitle, logoDataUrl);

  // Reference and metadata
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.gray);
  doc.text(`Referencia: ${data.auditNumber}`, 14, yPos + 2);
  doc.text(`Realizado por: ${data.createdBy}`, 14, yPos + 7);
  const dateStr = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString('es-ES')
    : new Date(data.createdAt).toLocaleDateString('es-ES');
  doc.text(`Fecha: ${dateStr}`, 14, yPos + 12);

  // Total score badge (right side)
  if (data.totalScore && data.totalScore.maximum > 0) {
    const scoreText = `${data.totalScore.obtained}/${data.totalScore.maximum}`;
    const percentText = `${data.totalScore.percentage}%`;
    doc.setFillColor(...BRAND.colors.primary);
    doc.roundedRect(pageWidth - 55, yPos - 2, 41, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(scoreText, pageWidth - 34.5, yPos + 6, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(percentText, pageWidth - 34.5, yPos + 12, { align: 'center' });
  }

  yPos += 22;

  // Iterate through ALL sections
  for (const section of data.sections) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Section header: colored bar
    doc.setFillColor(...BRAND.colors.primaryLight);
    doc.roundedRect(14, yPos - 4, pageWidth - 28, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 18, yPos + 3);
    yPos += 12;

    // Build table rows: each field as [label, value] with per-cell styling
    const tableBody: { content: string; styles?: Record<string, unknown> }[][] = [];

    for (const field of section.fields) {
      const isImage = field.type === 'file' || field.type === 'image_upload';
      const displayValue = formatFieldValue(field);

      if (isImage) {
        // Image fields: show as italic reference
        tableBody.push([
          { content: field.label, styles: { fontStyle: 'bold', textColor: BRAND.colors.gray, font: 'helvetica' } },
          { content: displayValue, styles: { fontStyle: 'italic', textColor: BRAND.colors.gray } },
        ]);
        continue;
      }

      const badgeColor = getValueBadgeColor(field);
      const valueCell: { content: string; styles?: Record<string, unknown> } = badgeColor
        ? { content: displayValue, styles: { fillColor: badgeColor } }
        : { content: displayValue };

      tableBody.push([
        { content: field.label, styles: { fontStyle: 'bold' } },
        valueCell,
      ]);
    }

    if (tableBody.length > 0) {
      autoTable(doc, {
        startY: yPos,
        body: tableBody,
        showHead: false,
        theme: 'plain',
        styles: {
          fontSize: 8,
          textColor: BRAND.colors.dark,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          lineWidth: 0.1,
          lineColor: [230, 230, 230],
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold', textColor: BRAND.colors.gray },
          1: { cellWidth: pageWidth - 28 - 60 },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    yPos += 2;
  }

  addBrandedFooter(doc);
  return doc;
}

export async function exportAuditToPDF(data: AuditExportData): Promise<void> {
  const doc = await buildAuditPdfDoc(data);
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
    head: [['Metrica', 'Valor', 'Variacion']],
    body: [
      ['Ventas', formatNumber(data.portfolio.ventas) + '\u20AC', `${data.portfolio.ventasChange >= 0 ? '+' : ''}${data.portfolio.ventasChange.toFixed(1)}%`],
      ['Pedidos', formatNumber(data.portfolio.pedidos), `${data.portfolio.pedidosChange >= 0 ? '+' : ''}${data.portfolio.pedidosChange.toFixed(1)}%`],
      ['Ticket Medio', `${data.portfolio.ticketMedio.toFixed(2)}\u20AC`, `${data.portfolio.ticketMedioChange >= 0 ? '+' : ''}${data.portfolio.ticketMedioChange.toFixed(1)}%`],
    ],
    ...BRANDED_TABLE_STYLES,
  });

  addBrandedFooter(doc);
  return doc.output('blob');
}

export async function generateReputationPdfBlob(data: ReputationExportData): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF();

  const startY = addBrandedHeader(doc, 'Reputacion', data.dateRange);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Canal', 'Rating', 'Reviews', '% Positivo', '% Negativo']],
    body: data.channelRatings.map((r) => [r.channel, r.rating.toFixed(1), formatNumber(r.totalReviews), `${r.positivePercent.toFixed(1)}%`, `${r.negativePercent.toFixed(1)}%`]),
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
      ...row.months.map((m) => m.revenueTarget ? `${(m.revenueTarget / 1000).toFixed(1)}k\u20AC` : '-'),
    ]),
    ...BRANDED_TABLE_STYLES,
    bodyStyles: { ...BRANDED_TABLE_STYLES.bodyStyles, fontSize: 7 },
  });

  addBrandedFooter(doc);
  return doc.output('blob');
}

export async function generateAuditPdfBlob(data: AuditExportData): Promise<Blob> {
  const doc = await buildAuditPdfDoc(data);
  return doc.output('blob');
}
