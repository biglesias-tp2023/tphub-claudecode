import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as d3 from 'd3';
import type { ChartMargin, BarChartDataItem } from './types';

interface BarChartProps {
  data: BarChartDataItem[];
  margin?: ChartMargin;
  defaultColor?: string;
  barRadius?: number;
  gridDash?: string;
  gridColor?: string;
  tickFontSize?: number;
  tickColor?: string;
  xAxisAngle?: number;
  xAxisHeight?: number;
  renderTooltip?: (item: BarChartDataItem, index: number) => ReactNode;
}

export function BarChart({
  data,
  margin = { top: 5, right: 5, left: 0, bottom: 5 },
  defaultColor = '#095789',
  barRadius = 4,
  gridDash = '3 3',
  gridColor = '#f0f0f0',
  tickFontSize = 10,
  tickColor = '#6b7280',
  xAxisAngle = -45,
  xAxisHeight = 60,
  renderTooltip,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{ item: BarChartDataItem; index: number; x: number; y: number } | null>(null);

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
    if (!svgRef.current || dimensions.width === 0 || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom - xAxisHeight + margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    const yTicks = y.ticks(5);
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
      .call(d3.axisBottom(x).tickSize(0));

    xAxis.select('.domain').remove();
    xAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor)
      .attr('text-anchor', 'end')
      .attr('transform', `rotate(${xAxisAngle})`)
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    // Y Axis
    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(0));

    yAxis.select('.domain').remove();
    yAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor);

    // Bars with rounded top corners
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label) || 0)
      .attr('y', (d) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - y(d.value))
      .attr('fill', (d) => d.color || defaultColor)
      .attr('fill-opacity', (d) => d.opacity ?? 1)
      .attr('rx', barRadius)
      .attr('ry', barRadius)
      .style('cursor', renderTooltip ? 'pointer' : 'default')
      .on('mouseenter', (event, d) => {
        if (!renderTooltip) return;
        const idx = data.indexOf(d);
        const rect = containerRef.current!.getBoundingClientRect();
        setTooltip({
          item: d,
          index: idx,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
        });
      })
      .on('mousemove', (event, d) => {
        if (!renderTooltip) return;
        const idx = data.indexOf(d);
        const rect = containerRef.current!.getBoundingClientRect();
        setTooltip({
          item: d,
          index: idx,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
        });
      })
      .on('mouseleave', () => setTooltip(null));

    // Clip bottom corners of bars (so only top is rounded)
    g.selectAll('.bar-bottom')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label) || 0)
      .attr('y', (d) => Math.max(y(d.value), innerHeight - barRadius))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.min(barRadius, innerHeight - y(d.value)))
      .attr('fill', (d) => d.color || defaultColor)
      .attr('fill-opacity', (d) => d.opacity ?? 1);
  }, [data, dimensions, margin, defaultColor, barRadius, gridDash, gridColor, tickFontSize, tickColor, xAxisAngle, xAxisHeight, renderTooltip]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {tooltip && renderTooltip && (
        <div
          className="absolute pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {renderTooltip(tooltip.item, tooltip.index)}
        </div>
      )}
    </div>
  );
}
