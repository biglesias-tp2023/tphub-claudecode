import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  select,
  scalePoint,
  scaleLinear,
  max,
  axisBottom,
  axisLeft,
  stack,
  area,
  curveMonotoneX,
  curveLinear,
  pointer,
  type Series,
} from 'd3';
import type { ChartMargin } from './types';

// ============================================
// TYPES
// ============================================

export interface StackedAreaDataItem {
  label: string;
  [key: string]: string | number;
}

export interface StackedAreaSeriesConfig {
  key: string;
  name: string;
  color: string;
  gradientOpacity?: [number, number];
}

interface AreaChartStackedProps {
  data: StackedAreaDataItem[];
  series: StackedAreaSeriesConfig[];
  margin?: ChartMargin;
  gridDash?: string;
  gridColor?: string;
  gridVertical?: boolean;
  tickFontSize?: number;
  tickColor?: string;
  yTickFormatter?: (value: number) => string;
  renderTooltip?: (item: StackedAreaDataItem, xLabel: string) => ReactNode;
  curveType?: 'monotone' | 'linear';
  yAxisLabel?: string;
}

// ============================================
// COMPONENT
// ============================================

export function AreaChartStacked({
  data,
  series,
  margin = { top: 10, right: 10, left: 35, bottom: 24 },
  gridDash = '3 3',
  gridColor = '#E5E7EB',
  gridVertical = false,
  tickFontSize = 10,
  tickColor = '#9CA3AF',
  yTickFormatter,
  renderTooltip,
  curveType = 'monotone',
  yAxisLabel,
}: AreaChartStackedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{
    item: StackedAreaDataItem;
    xLabel: string;
    x: number;
    y: number;
  } | null>(null);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    const clear = () => setTooltip(null);
    window.addEventListener('drawer-scroll', clear);
    return () => window.removeEventListener('drawer-scroll', clear);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || data.length === 0 || series.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const defs = svg.append('defs');

    // Gradients per series
    series.forEach((s) => {
      const gradientId = `stacked-area-gradient-${s.key}`;
      const gradient = defs
        .append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');

      const [topOpacity, bottomOpacity] = s.gradientOpacity || [0.7, 0.3];
      gradient.append('stop').attr('offset', '5%').attr('stop-color', s.color).attr('stop-opacity', topOpacity);
      gradient.append('stop').attr('offset', '95%').attr('stop-color', s.color).attr('stop-opacity', bottomOpacity);
    });

    // Scales
    const x = scalePoint()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    // Stack data using D3 stack
    const keys = series.map((s) => s.key);
    const stackedData = stack<StackedAreaDataItem>().keys(keys)(data);

    const yMax = max(stackedData[stackedData.length - 1] || [], (d) => d[1]) || 1;
    const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    // Grid lines (horizontal)
    const yTicks = y.ticks(5);
    g.selectAll('.grid-h')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', gridDash);

    if (gridVertical) {
      g.selectAll('.grid-v')
        .data(x.domain())
        .enter()
        .append('line')
        .attr('x1', (d) => x(d) || 0)
        .attr('x2', (d) => x(d) || 0)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', gridColor)
        .attr('stroke-dasharray', gridDash);
    }

    // X Axis
    const xAxis = g.append('g').attr('transform', `translate(0,${innerHeight})`).call(axisBottom(x).tickSize(0));
    xAxis.select('.domain').attr('stroke', gridColor);
    xAxis.selectAll('text').attr('font-size', tickFontSize).attr('fill', tickColor);

    // Y Axis
    const yAxisG = g.append('g').call(
      axisLeft(y)
        .ticks(5)
        .tickSize(0)
        .tickFormat((d) => (yTickFormatter ? yTickFormatter(d as number) : String(d)))
    );
    yAxisG.select('.domain').remove();
    yAxisG.selectAll('text').attr('font-size', tickFontSize).attr('fill', tickColor);

    // Y Axis label
    if (yAxisLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -margin.left + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', '#9CA3AF')
        .text(yAxisLabel);
    }

    const curve = curveType === 'monotone' ? curveMonotoneX : curveLinear;

    // Draw stacked areas (bottom to top)
    type StackPoint = Series<StackedAreaDataItem, string>[number];
    stackedData.forEach((layer) => {
      const areaGen = area<StackPoint>()
        .x((d) => x(d.data.label) || 0)
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(curve);

      // Area fill
      g.append('path')
        .datum(layer)
        .attr('d', areaGen)
        .attr('fill', `url(#stacked-area-gradient-${layer.key})`)
        .attr('stroke', 'none');

      // Stroke line on top edge
      const lineGen = area<StackPoint>()
        .x((d) => x(d.data.label) || 0)
        .y0((d) => y(d[1]))
        .y1((d) => y(d[1]))
        .curve(curve);

      g.append('path')
        .datum(layer)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', series.find((s) => s.key === layer.key)?.color || '#ccc')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6);
    });

    // Tooltip overlay
    if (renderTooltip) {
      const hoverGroup = g.append('g').attr('class', 'hover-group').style('display', 'none');

      // Vertical guide line
      hoverGroup
        .append('line')
        .attr('class', 'hover-guide')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#D1D5DB')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 3');

      // Dot for total (top of stack)
      const hoverDot = hoverGroup
        .append('circle')
        .attr('r', 4)
        .attr('fill', '#6B7280')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      const overlay = g
        .append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair');

      overlay.on('mousemove', (event) => {
        const [mx] = pointer(event);
        const domain = x.domain();
        const xPositions = domain.map((d) => x(d) || 0);

        let closestIdx = 0;
        let minDist = Infinity;
        xPositions.forEach((pos, i) => {
          const dist = Math.abs(pos - mx);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        });

        const hoverX = xPositions[closestIdx] || 0;
        const topLayer = stackedData[stackedData.length - 1];
        const topVal = topLayer ? topLayer[closestIdx][1] : 0;

        hoverGroup.style('display', null);
        hoverGroup.select('.hover-guide').attr('x1', hoverX).attr('x2', hoverX);
        hoverDot.attr('cx', hoverX).attr('cy', y(topVal));

        const rect = containerRef.current!.getBoundingClientRect();
        const xPos = hoverX + margin.left;
        setTooltip({
          item: data[closestIdx],
          xLabel: domain[closestIdx],
          x: xPos,
          y: event.clientY - rect.top - 10,
        });
      });

      overlay.on('mouseleave', () => {
        hoverGroup.style('display', 'none');
        setTooltip(null);
      });
    }
  }, [data, series, dimensions, margin, gridDash, gridColor, gridVertical, tickFontSize, tickColor, yTickFormatter, renderTooltip, curveType, yAxisLabel]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {tooltip && renderTooltip && (
        <div
          className="absolute pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {renderTooltip(tooltip.item, tooltip.xLabel)}
        </div>
      )}
    </div>
  );
}
