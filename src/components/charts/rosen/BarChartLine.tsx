import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { select, scaleBand, scaleLinear, max, axisBottom, axisLeft, axisRight, line, curveMonotoneX } from 'd3';
import type { ChartMargin } from './types';

export interface BarLineDataItem {
  label: string;
  barValue: number;
  lineValue: number;
}

interface BarChartLineProps {
  data: BarLineDataItem[];
  margin?: ChartMargin;
  barColor?: string;
  lineColor?: string;
  barRadius?: number;
  gridDash?: string;
  gridColor?: string;
  tickFontSize?: number;
  tickColor?: string;
  yBarFormatter?: (value: number) => string;
  yLineFormatter?: (value: number) => string;
  barLabel?: string;
  lineLabel?: string;
  renderTooltip?: (item: BarLineDataItem) => ReactNode;
}

export function BarChartLine({
  data,
  margin = { top: 10, right: 40, left: 35, bottom: 24 },
  barColor = '#095789',
  lineColor = '#ffa166',
  barRadius = 3,
  gridDash = '3 3',
  gridColor = '#E5E7EB',
  tickFontSize = 10,
  tickColor = '#9CA3AF',
  yBarFormatter,
  yLineFormatter,
  renderTooltip,
}: BarChartLineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{ item: BarLineDataItem; x: number; y: number } | null>(null);

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
    if (!svgRef.current || dimensions.width === 0 || data.length === 0) return;

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

    const maxBar = max(data, (d) => d.barValue) || 1;
    const yBar = scaleLinear()
      .domain([0, maxBar * 1.1])
      .nice()
      .range([innerHeight, 0]);

    const maxLine = max(data, (d) => d.lineValue) || 1;
    const yLine = scaleLinear()
      .domain([0, maxLine * 1.2])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    const yTicks = yBar.ticks(4);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yBar(d))
      .attr('y2', (d) => yBar(d))
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

    // Y Left Axis (bars)
    const yLeftAxis = g.append('g')
      .call(
        axisLeft(yBar)
          .ticks(4)
          .tickSize(0)
          .tickFormat((d) => yBarFormatter ? yBarFormatter(d as number) : String(d))
      );
    yLeftAxis.select('.domain').remove();
    yLeftAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor);

    // Y Right Axis (line)
    const yRightAxis = g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(
        axisRight(yLine)
          .ticks(4)
          .tickSize(0)
          .tickFormat((d) => yLineFormatter ? yLineFormatter(d as number) : String(d))
      );
    yRightAxis.select('.domain').remove();
    yRightAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', lineColor);

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label) || 0)
      .attr('y', (d) => yBar(d.barValue))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - yBar(d.barValue))
      .attr('fill', barColor)
      .attr('fill-opacity', 0.75)
      .attr('rx', barRadius)
      .attr('ry', barRadius)
      .style('cursor', renderTooltip ? 'pointer' : 'default')
      .on('mouseenter', (event, d) => {
        if (!renderTooltip) return;
        const rect = containerRef.current!.getBoundingClientRect();
        setTooltip({ item: d, x: event.clientX - rect.left, y: event.clientY - rect.top - 10 });
      })
      .on('mousemove', (event, d) => {
        if (!renderTooltip) return;
        const rect = containerRef.current!.getBoundingClientRect();
        setTooltip({ item: d, x: event.clientX - rect.left, y: event.clientY - rect.top - 10 });
      })
      .on('mouseleave', () => setTooltip(null));

    // Clip bottom corners
    g.selectAll('.bar-bottom')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label) || 0)
      .attr('y', (d) => Math.max(yBar(d.barValue), innerHeight - barRadius))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.min(barRadius, innerHeight - yBar(d.barValue)))
      .attr('fill', barColor)
      .attr('fill-opacity', 0.75);

    // Line
    const linePath = line<BarLineDataItem>()
      .x((d) => (x(d.label) || 0) + x.bandwidth() / 2)
      .y((d) => yLine(d.lineValue))
      .curve(curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 2)
      .attr('d', linePath);

    // Line dots
    g.selectAll('.line-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => (x(d.label) || 0) + x.bandwidth() / 2)
      .attr('cy', (d) => yLine(d.lineValue))
      .attr('r', 3)
      .attr('fill', 'white')
      .attr('stroke', lineColor)
      .attr('stroke-width', 1.5);
  }, [data, dimensions, margin, barColor, lineColor, barRadius, gridDash, gridColor, tickFontSize, tickColor, yBarFormatter, yLineFormatter, renderTooltip]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {tooltip && renderTooltip && (
        <div
          className="absolute pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {renderTooltip(tooltip.item)}
        </div>
      )}
    </div>
  );
}
