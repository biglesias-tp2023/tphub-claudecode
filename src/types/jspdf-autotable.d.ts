import { jsPDF } from 'jspdf';

declare module 'jspdf-autotable' {
  interface AutoTableOptions {
    startY?: number;
    head?: (string | number)[][];
    body?: (string | number)[][];
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: {
      fillColor?: number[];
      fontSize?: number;
      textColor?: number[];
      fontStyle?: string;
    };
    bodyStyles?: {
      fontSize?: number;
      textColor?: number[];
    };
    columnStyles?: Record<number, {
      cellWidth?: number | 'auto' | 'wrap';
      fontStyle?: string;
    }>;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    tableWidth?: number | 'auto' | 'wrap';
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}
