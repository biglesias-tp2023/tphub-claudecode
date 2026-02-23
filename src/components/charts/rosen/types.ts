export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
  opacity?: number;
}

export interface DonutChartDataItem {
  label: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export interface AreaSeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  gradientOpacity?: [number, number];
  strokeWidth?: number;
  strokeDasharray?: string;
  stackId?: string;
  showDots?: boolean;
  yAxisId?: 'left' | 'right';
}

export interface ReferenceLineConfig {
  x: string;
  stroke: string;
  strokeDasharray?: string;
  label?: string;
  labelColor?: string;
}
