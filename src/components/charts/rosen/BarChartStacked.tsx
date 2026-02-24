import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { select, scaleBand, scaleLinear, max, axisBottom, axisLeft, stack } from 'd3';
import type { ChartMargin } from './types';

export interface StackedBarDataItem {
  label: string;
  [key: string]: string | number;
}

export interface StackedBarSeriesConfig {
  key: string;
  name: string;
  color: string;
}

interface BarChartStackedProps {
  data: StackedBarDataItem[];
  series: StackedBarSeriesConfig[];
  margin?: ChartMargin;
  barRadius?: number;
  gridDash?: string;
  gridColor?: string;
  tickFontSize?: number;
  tickColor?: string;
  yTickFormatter?: (value: number) => string;
  renderTooltip?: (item: StackedBarDataItem, seriesKey: string) => ReactNode;
}

export function BarChartStacked({
  data,
  series,
  margin = { top: 10, right: 10, left: 35, bottom: 24 },
  barRadius = 3,
  gridDash = '3 3',
  gridColor = '#E5E7EB',
  tickFontSize = 10,
  tickColor = '#9CA3AF',
  yTickFormatter,
  renderTooltip,
}: BarChartStackedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{ item: StackedBarDataItem; seriesKey: string; x: number; y: number } | null>(null);

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
    if (!svgRef.current || dimensions.width === 0 || data.length === 0 || series.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.35);

    // Stack data
    const keys = series.map((s) => s.key);
    const colorMap = new Map(series.map((s) => [s.key, s.color]));
    const stackedData = stack<StackedBarDataItem>().keys(keys)(data);

    const maxY = max(stackedData[stackedData.length - 1] || [], (d) => d[1]) || 1;
    const y = scaleLinear()
      .domain([0, maxY * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    const yTicks = y.ticks(4);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', gridDash);

    // X Axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).tickSize(0));
    xAxis.select('.domain').remove();
    xAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor)
      .attr('dy', '0.8em');

    // Y Axis
    const yAxis = g.append('g')
      .call(
        axisLeft(y)
          .ticks(4)
          .tickSize(0)
          .tickFormat((d) => yTickFormatter ? yTickFormatter(d as number) : String(d))
      );
    yAxis.select('.domain').remove();
    yAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor);

    // Draw stacked bars
    stackedData.forEach((layer, layerIdx) => {
      const isTopLayer = layerIdx === stackedData.length - 1;
      const color = colorMap.get(layer.key) || '#ccc';

      g.selectAll(`.bar-${layer.key}`)
        .data(layer)
        .enter()
        .append('rect')
        .attr('x', (d) => x(d.data.label) || 0)
        .attr('y', (d) => y(d[1]))
        .attr('width', x.bandwidth())
        .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
        .attr('fill', color)
        .attr('rx', isTopLayer ? barRadius : 0)
        .attr('ry', isTopLayer ? barRadius : 0)
        .style('cursor', renderTooltip ? 'pointer' : 'default')
        .on('mouseenter', (event, d) => {
          if (!renderTooltip) return;
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({
            item: d.data,
            seriesKey: layer.key,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
          });
        })
        .on('mousemove', (event, d) => {
          if (!renderTooltip) return;
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({
            item: d.data,
            seriesKey: layer.key,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
          });
        })
        .on('mouseleave', () => setTooltip(null));
    });
  }, [data, series, dimensions, margin, barRadius, gridDash, gridColor, tickFontSize, tickColor, yTickFormatter, renderTooltip]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {tooltip && renderTooltip && (
        <div
          className="absolute pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {renderTooltip(tooltip.item, tooltip.seriesKey)}
        </div>
      )}
    </div>
  );
}
