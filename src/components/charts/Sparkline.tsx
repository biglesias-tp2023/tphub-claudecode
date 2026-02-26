import { memo, useMemo, useState, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, area, curveMonotoneX } from 'd3-shape';

export interface SparklineLabel {
  value: string; // e.g. "1.520€"
  sub: string;   // e.g. "03/02 - 09/02"
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  areaOpacity?: number;
  labels?: SparklineLabel[];
}

/**
 * Lightweight SVG sparkline for rendering inline in tables.
 * Uses d3-scale and d3-shape for smooth monotone curves.
 *
 * Empty state: horizontal gray line at mid-height.
 * When `labels` are provided, shows a tooltip on hover with the value and date range.
 */
export const Sparkline = memo(function Sparkline({
  data,
  width = 90,
  height = 28,
  color = '#095789',
  showArea = true,
  areaOpacity = 0.1,
  labels,
}: SparklineProps) {
  const padding = 2;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const computed = useMemo(() => {
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

    return { linePath, areaPath, points };
  }, [data, width, height, padding, showArea]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!computed || !labels || labels.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const segWidth = width / data.length;
      const idx = Math.min(Math.max(Math.floor(x / segWidth), 0), data.length - 1);
      setHoveredIndex(idx);
    },
    [computed, labels, width, data.length]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Empty state
  if (!computed) {
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

  const hasTooltip = labels && labels.length > 0 && hoveredIndex !== null;
  const tooltipPoint = hasTooltip ? computed.points[hoveredIndex] : null;
  const tooltipLabel = hasTooltip ? labels[hoveredIndex] : null;

  // Tooltip positioning: show above the point, flip if too close to edges
  const tooltipW = 110;
  const tooltipH = 34;
  let tooltipX = tooltipPoint ? tooltipPoint[0] - tooltipW / 2 : 0;
  // Clamp horizontal
  if (tooltipX < 0) tooltipX = 0;
  if (tooltipX + tooltipW > width) tooltipX = width - tooltipW;
  const tooltipY = -tooltipH - 4;

  return (
    <svg
      width={width}
      height={height}
      className="block"
      style={{ overflow: 'visible' }}
      onMouseMove={labels && labels.length > 0 ? handleMouseMove : undefined}
      onMouseLeave={labels && labels.length > 0 ? handleMouseLeave : undefined}
    >
      {computed.areaPath && (
        <path d={computed.areaPath} fill={color} opacity={areaOpacity} />
      )}
      <path
        d={computed.linePath!}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hover dot */}
      {tooltipPoint && (
        <circle
          cx={tooltipPoint[0]}
          cy={tooltipPoint[1]}
          r={3}
          fill={color}
          stroke="white"
          strokeWidth={1.5}
        />
      )}
      {/* Tooltip */}
      {tooltipLabel && tooltipPoint && (
        <foreignObject
          x={tooltipX}
          y={tooltipY}
          width={tooltipW}
          height={tooltipH}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: '#1f2937',
              color: 'white',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 10,
              lineHeight: '13px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 600 }}>{tooltipLabel.value}</div>
            <div style={{ opacity: 0.7 }}>{tooltipLabel.sub}</div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
});
