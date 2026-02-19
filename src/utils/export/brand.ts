/**
 * Brand configuration, logo rendering, PDF header/footer, and dynamic library imports.
 *
 * Libraries are loaded dynamically to reduce initial bundle size:
 * - jsPDF + jspdf-autotable: ~200KB (loaded only when generating PDFs)
 * - xlsx: ~400KB (loaded only when generating Excel files)
 *
 * @module utils/export/brand
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
export async function loadPdfLibraries(): Promise<{ jsPDF: JsPDFClass; autoTable: AutoTableFn }> {
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
export async function loadXlsxLibrary(): Promise<XLSXLib> {
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

export const BRAND = {
  name: 'ThinkPaladar',
  tagline: 'Consultoría de Delivery',
  colors: {
    primary: [9, 87, 137] as [number, number, number],       // #095789 - ThinkPaladar primary
    primaryLight: [200, 225, 240] as [number, number, number], // Light blue for backgrounds
    secondary: [7, 69, 103] as [number, number, number],     // #074567 - Darker blue
    accent: [255, 161, 102] as [number, number, number],     // #ffa166 - ThinkPaladar accent orange
    dark: [30, 41, 59] as [number, number, number],
    gray: [100, 116, 139] as [number, number, number],
    lightGray: [243, 247, 249] as [number, number, number],  // #f3f7f9 - Background
  },
};

// ThinkPaladar pictogram SVG rendered to PNG data URL (cached)
let cachedLogoDataUrl: string | null = null;

export async function loadLogoImage(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a6ba8"/>
      <stop offset="100%" style="stop-color:#095789"/>
    </linearGradient></defs>
    <rect width="32" height="32" rx="6" fill="url(#g)"/>
    <g transform="translate(4,5) scale(0.028)">
      <path fill="white" d="m304.81,209.81v-104.9h-120.87v104.9H63.58v135.66h120.36v194.79c0,120.88,84.35,205.23,205.23,205.23h187.73c120.88,0,205.23-84.35,205.23-205.23V209.81h-477.32Zm356.45,316.54c0,54.78-42.61,81.74-84.36,81.74h-187.73c-41.74,0-84.36-26.95-84.36-81.74v-180.88h118.04v109.38c0,33.24,26.94,60.18,60.18,60.18h0c33.24,0,60.18-26.94,60.18-60.18v-109.38h118.04v180.88Z"/>
    </g>
  </svg>`;

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 128, 128);
  URL.revokeObjectURL(url);

  cachedLogoDataUrl = canvas.toDataURL('image/png');
  return cachedLogoDataUrl;
}

/**
 * Adds ThinkPaladar branded header to the PDF.
 * If logoDataUrl is provided, uses the pictogram image instead of text.
 */
export function addBrandedHeader(doc: jsPDF, title: string, subtitle?: string, logoDataUrl?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, 10, 14, 14);
  } else {
    // Fallback: draw circle with "TP" text
    doc.setFillColor(...BRAND.colors.primary);
    doc.circle(22, 18, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TP', 22, 20, { align: 'center' });
  }

  doc.setTextColor(...BRAND.colors.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND.name, 32, 16);

  doc.setTextColor(...BRAND.colors.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.tagline, 32, 21);

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
 * Adds branded footer to all pages of the PDF.
 */
export function addBrandedFooter(doc: jsPDF) {
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

    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
  }
}

export const BRANDED_TABLE_STYLES = {
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
