import { memo, useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, area, curveMonotoneX } from 'd3-shape';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  areaOpacity?: number;
}

/**
 * Lightweight SVG sparkline for rendering inline in tables.
 * Uses d3-scale and d3-shape for smooth monotone curves.
 *
 * Empty state: horizontal gray line at mid-height.
 */
export const Sparkline = memo(function Sparkline({
  data,
  width = 90,
  height = 28,
  color = '#095789',
  showArea = true,
  areaOpacity = 0.1,
}: SparklineProps) {
  const padding = 2;

  const paths = useMemo(() => {
    // Empty state: no data or all zeros
    if (!data || data.length === 0 || data.every((v) => v === 0)) {
      return null;
    }

    const xScale = scaleLinear()
      .domain([0, data.length - 1])
      .range([padding, width - padding]);

    const max = Math.max(...data);

    // Y-axis always starts at 0 so variations look proportional to real revenue
    const yScale = scaleLinear()
      .domain([0, max === 0 ? 1 : max])
      .range([height - padding, padding]);

    const points = data.map((d, i) => [xScale(i), yScale(d)] as [number, number]);

    const linePath = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveMonotoneX)(points);

    let areaPath: string | null = null;
    if (showArea) {
      areaPath = area<[number, number]>()
        .x((d) => d[0])
        .y0(height - padding)
        .y1((d) => d[1])
        .curve(curveMonotoneX)(points);
    }

    return { linePath, areaPath };
  }, [data, width, height, padding, showArea]);

  // Empty state
  if (!paths) {
    const midY = height / 2;
    return (
      <svg width={width} height={height} className="block">
        <line
          x1={padding}
          y1={midY}
          x2={width - padding}
          y2={midY}
          stroke="#d1d5db"
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className="block">
      {paths.areaPath && (
        <path d={paths.areaPath} fill={color} opacity={areaOpacity} />
      )}
      <path
        d={paths.linePath!}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
