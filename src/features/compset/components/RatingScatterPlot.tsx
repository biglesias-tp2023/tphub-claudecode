import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { PLATFORM_COLORS } from '../config';
import type { CompetitorWithData } from '../types';

interface RatingScatterPlotProps {
  hero: CompetitorWithData | null;
  competitors: CompetitorWithData[];
}

interface DotData {
  name: string;
  rating: number;
  reviews: number;
  platform: string;
  isHero: boolean;
}

export function RatingScatterPlot({ hero, competitors }: RatingScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredDot, setHoveredDot] = useState<DotData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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

  const dots: DotData[] = useMemo(() => {
    const result: DotData[] = [];
    if (hero?.snapshot) {
      result.push({
        name: hero.competitor.name,
        rating: hero.snapshot.rating ?? 0,
        reviews: hero.snapshot.reviewCount ?? 0,
        platform: hero.competitor.platform,
        isHero: true,
      });
    }
    for (const c of competitors) {
      if (!c.snapshot) continue;
      result.push({
        name: c.competitor.name,
        rating: c.snapshot.rating ?? 0,
        reviews: c.snapshot.reviewCount ?? 0,
        platform: c.competitor.platform,
        isHero: false,
      });
    }
    return result;
  }, [hero, competitors]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dots.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 45 };
    const w = dimensions.width - margin.left - margin.right;
    const h = dimensions.height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xExtent = d3.extent(dots, (d) => d.reviews) as [number, number];
    const yMin = Math.min(3, d3.min(dots, (d) => d.rating) ?? 3);
    const yMax = Math.max(5, d3.max(dots, (d) => d.rating) ?? 5);

    const x = d3.scaleLinear().domain([0, xExtent[1] * 1.1]).range([0, w]);
    const y = d3.scaleLinear().domain([yMin - 0.1, yMax + 0.1]).range([h, 0]);

    // Grid
    g.selectAll('.grid-y')
      .data(y.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#f0f0f0')
      .attr('stroke-dasharray', '3 3');

    // Axes
    const xAxis = g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5));
    xAxis.select('.domain').remove();
    xAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5));
    yAxis.select('.domain').remove();
    yAxis.selectAll('text').attr('font-size', 10).attr('fill', '#6b7280');

    // Axis labels
    svg
      .append('text')
      .attr('x', margin.left + w / 2)
      .attr('y', dimensions.height - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#9ca3af')
      .text('N.º de reviews');

    svg
      .append('text')
      .attr('transform', `translate(14, ${margin.top + h / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#9ca3af')
      .text('Rating');

    // Dots
    g.selectAll('.dot')
      .data(dots)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.reviews))
      .attr('cy', (d) => y(d.rating))
      .attr('r', (d) => (d.isHero ? 8 : 6))
      .attr('fill', (d) => (d.isHero ? '#095789' : PLATFORM_COLORS[d.platform] || '#9ca3af'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const rect = containerRef.current!.getBoundingClientRect();
        setHoveredDot(d);
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 12,
        });
      })
      .on('mousemove', (event, d) => {
        const rect = containerRef.current!.getBoundingClientRect();
        setHoveredDot(d);
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 12,
        });
      })
      .on('mouseleave', () => setHoveredDot(null));

    // Labels
    g.selectAll('.label')
      .data(dots)
      .enter()
      .append('text')
      .attr('x', (d) => x(d.reviews))
      .attr('y', (d) => y(d.rating) - (d.isHero ? 12 : 10))
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', (d) => (d.isHero ? '#095789' : '#6b7280'))
      .attr('font-weight', (d) => (d.isHero ? '600' : '400'))
      .text((d) => d.name);
  }, [dots, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {hoveredDot && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold">{hoveredDot.name}</div>
          <div>Rating: {hoveredDot.rating.toFixed(2)}</div>
          <div>Reviews: {hoveredDot.reviews.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
