import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { select, pie, arc } from 'd3';
import type { PieArcDatum } from 'd3';
import type { DonutChartDataItem } from './types';

interface DonutChartProps {
  data: DonutChartDataItem[];
  valueKey?: string;
  innerRadiusRatio?: number;
  outerRadiusRatio?: number;
  paddingAngle?: number;
  centerY?: number;
  renderTooltip?: (item: DonutChartDataItem) => ReactNode;
  renderLegend?: (items: DonutChartDataItem[]) => ReactNode;
}

export function DonutChart({
  data,
  valueKey = 'value',
  innerRadiusRatio = 0.6,
  outerRadiusRatio = 0.9,
  paddingAngle = 0.02,
  centerY = 0.4,
  renderTooltip,
  renderLegend,
}: DonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{ item: DonutChartDataItem; x: number; y: number } | null>(null);

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

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // Reserve space for legend at bottom
    const legendHeight = renderLegend ? dimensions.height * 0.35 : 0;
    const chartHeight = dimensions.height - legendHeight;

    const radius = Math.min(dimensions.width, chartHeight) / 2;
    const cx = dimensions.width / 2;
    const cy = chartHeight * centerY;

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    const pieGen = pie<DonutChartDataItem>()
      .value((d) => (d as unknown as Record<string, number>)[valueKey] || 0)
      .padAngle(paddingAngle)
      .sort(null);

    const arcGen = arc<PieArcDatum<DonutChartDataItem>>()
      .innerRadius(radius * innerRadiusRatio)
      .outerRadius(radius * outerRadiusRatio);

    const arcs = g.selectAll('.arc')
      .data(pieGen(data))
      .enter()
      .append('path')
      .attr('d', arcGen)
      .attr('fill', (d) => d.data.color)
      .style('cursor', renderTooltip ? 'pointer' : 'default');

    if (renderTooltip) {
      arcs
        .on('mouseenter', (event, d) => {
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({
            item: d.data,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
          });
        })
        .on('mousemove', (event, d) => {
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({
            item: d.data,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
          });
        })
        .on('mouseleave', () => setTooltip(null));
    }
  }, [data, dimensions, valueKey, innerRadiusRatio, outerRadiusRatio, paddingAngle, centerY, renderTooltip, renderLegend]);

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
      {renderLegend && (
        <div className="absolute bottom-0 left-0 right-0">
          {renderLegend(data)}
        </div>
      )}
    </div>
  );
}
