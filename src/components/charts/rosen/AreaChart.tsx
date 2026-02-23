import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { select, scalePoint, scaleLinear, max, axisBottom, axisLeft, axisRight, curveMonotoneX, curveLinear, area, line, pointer } from 'd3';
import type { ChartMargin, AreaSeriesConfig, ReferenceLineConfig } from './types';

interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: AreaSeriesConfig[];
  margin?: ChartMargin;
  gridDash?: string;
  gridColor?: string;
  gridVertical?: boolean;
  tickFontSize?: number;
  tickColor?: string;
  yTickFormatter?: (value: number) => string;
  rightYTickFormatter?: (value: number) => string;
  referenceLines?: ReferenceLineConfig[];
  renderTooltip?: (dataPoint: Record<string, unknown>, xLabel: string) => ReactNode;
  curveType?: 'monotone' | 'linear';
}

export function AreaChart({
  data,
  xKey,
  series,
  margin = { top: 10, right: 10, left: 0, bottom: 0 },
  gridDash = '3 3',
  gridColor = '#E5E7EB',
  gridVertical = true,
  tickFontSize = 12,
  tickColor = '#6B7280',
  yTickFormatter,
  rightYTickFormatter,
  referenceLines,
  renderTooltip,
  curveType = 'monotone',
}: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{ dataPoint: Record<string, unknown>; xLabel: string; x: number; y: number } | null>(null);

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

    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const defs = svg.append('defs');

    // Gradients
    series.forEach((s) => {
      const gradientId = `gradient-${s.dataKey}`;
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0').attr('y1', '0')
        .attr('x2', '0').attr('y2', '1');

      const [topOpacity, bottomOpacity] = s.gradientOpacity || [0.3, 0];
      gradient.append('stop').attr('offset', '5%').attr('stop-color', s.color).attr('stop-opacity', topOpacity);
      gradient.append('stop').attr('offset', '95%').attr('stop-color', s.color).attr('stop-opacity', bottomOpacity);
    });

    // Scales
    const x = scalePoint()
      .domain(data.map((d) => String(d[xKey])))
      .range([0, innerWidth])
      .padding(0.1);

    // Compute stacked values if needed
    const stackGroups = new Map<string, AreaSeriesConfig[]>();
    series.forEach((s) => {
      if (s.stackId) {
        const group = stackGroups.get(s.stackId) || [];
        group.push(s);
        stackGroups.set(s.stackId, group);
      }
    });

    // Build stacked data
    const stackedValues = new Map<string, Map<number, number>>(); // dataKey -> dataIndex -> stacked value
    stackGroups.forEach((groupSeries) => {
      data.forEach((d, i) => {
        let cumulative = 0;
        groupSeries.forEach((s) => {
          const raw = Number(d[s.dataKey]) || 0;
          cumulative += raw;
          if (!stackedValues.has(s.dataKey)) stackedValues.set(s.dataKey, new Map());
          stackedValues.get(s.dataKey)!.set(i, cumulative);
        });
      });
    });

    // Get the value for a series at a data index (stacked or raw)
    const getValue = (s: AreaSeriesConfig, i: number): number => {
      if (s.stackId && stackedValues.has(s.dataKey)) {
        return stackedValues.get(s.dataKey)!.get(i) || 0;
      }
      return Number(data[i][s.dataKey]) || 0;
    };

    // Get the baseline for a stacked series
    const getBaseline = (s: AreaSeriesConfig, i: number): number => {
      if (!s.stackId) return 0;
      const group = stackGroups.get(s.stackId);
      if (!group) return 0;
      const idx = group.indexOf(s);
      if (idx <= 0) return 0;
      const prevSeries = group[idx - 1];
      return stackedValues.get(prevSeries.dataKey)?.get(i) || 0;
    };

    // Dual Y-axis: split series into left and right groups
    const leftSeries = series.filter((s) => s.yAxisId !== 'right');
    const rightSeries = series.filter((s) => s.yAxisId === 'right');
    const hasRightAxis = rightSeries.length > 0;

    const yMaxLeft = max(data.flatMap((_, i) =>
      leftSeries.map((s) => getValue(s, i))
    )) || 0;

    const y = scaleLinear()
      .domain([0, yMaxLeft])
      .nice()
      .range([innerHeight, 0]);

    const yMaxRight = hasRightAxis
      ? (max(data.flatMap((_, i) => rightSeries.map((s) => getValue(s, i)))) || 0)
      : 0;

    const yRight = scaleLinear()
      .domain([0, yMaxRight])
      .nice()
      .range([innerHeight, 0]);

    // Helper to pick the correct y scale for a series
    const getYScale = (s: AreaSeriesConfig) => s.yAxisId === 'right' ? yRight : y;

    // Grid
    const yTicks = y.ticks(5);
    g.selectAll('.grid-h')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', gridDash);

    if (gridVertical) {
      const xDomain = x.domain();
      g.selectAll('.grid-v')
        .data(xDomain)
        .enter()
        .append('line')
        .attr('x1', (d) => x(d) || 0).attr('x2', (d) => x(d) || 0)
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', gridColor)
        .attr('stroke-dasharray', gridDash);
    }

    // X Axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).tickSize(0));

    xAxis.select('.domain').attr('stroke', gridColor);
    xAxis.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor);

    // Y Axis
    const yAxisG = g.append('g')
      .call(
        axisLeft(y)
          .ticks(5)
          .tickSize(0)
          .tickFormat((d) => yTickFormatter ? yTickFormatter(d as number) : String(d))
      );

    yAxisG.select('.domain').remove();
    yAxisG.selectAll('text')
      .attr('font-size', tickFontSize)
      .attr('fill', tickColor);

    // Right Y Axis (if any series uses yAxisId: 'right')
    if (hasRightAxis) {
      const yRightAxisG = g.append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(
          axisRight(yRight)
            .ticks(5)
            .tickSize(0)
            .tickFormat((d) => rightYTickFormatter ? rightYTickFormatter(d as number) : String(d))
        );

      yRightAxisG.select('.domain').remove();
      yRightAxisG.selectAll('text')
        .attr('font-size', tickFontSize)
        .attr('fill', tickColor);
    }

    const curve = curveType === 'monotone' ? curveMonotoneX : curveLinear;

    // Draw areas and lines (in order so later series draw on top)
    series.forEach((s) => {
      const yScale = getYScale(s);

      const areaGen = area<Record<string, unknown>>()
        .x((d) => x(String(d[xKey])) || 0)
        .y0((_, i) => yScale(getBaseline(s, i)))
        .y1((_, i) => yScale(getValue(s, i)))
        .curve(curve);

      const lineGen = line<Record<string, unknown>>()
        .x((d) => x(String(d[xKey])) || 0)
        .y((_, i) => yScale(getValue(s, i)))
        .curve(curve);

      // Area fill
      g.append('path')
        .datum(data)
        .attr('d', areaGen)
        .attr('fill', `url(#gradient-${s.dataKey})`)
        .attr('stroke', 'none');

      // Line
      const linePath = g.append('path')
        .datum(data)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', s.color)
        .attr('stroke-width', s.strokeWidth || 2);

      if (s.strokeDasharray) {
        linePath.attr('stroke-dasharray', s.strokeDasharray);
      }

      // Dots
      if (s.showDots !== false) {
        g.selectAll(`.dot-${s.dataKey}`)
          .data(data)
          .enter()
          .append('circle')
          .attr('cx', (d) => x(String(d[xKey])) || 0)
          .attr('cy', (_, i) => yScale(getValue(s, i)))
          .attr('r', 3)
          .attr('fill', s.color);
      }
    });

    // Reference lines
    referenceLines?.forEach((rl) => {
      const xPos = x(rl.x);
      if (xPos == null) return;

      g.append('line')
        .attr('x1', xPos).attr('x2', xPos)
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', rl.stroke)
        .attr('stroke-dasharray', rl.strokeDasharray || '')
        .attr('stroke-width', 1.5);

      if (rl.label) {
        g.append('text')
          .attr('x', xPos)
          .attr('y', -4)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', rl.labelColor || rl.stroke)
          .text(rl.label);
      }
    });

    // Tooltip overlay
    if (renderTooltip) {
      const overlay = g.append('rect')
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

        const rect = containerRef.current!.getBoundingClientRect();
        const xPos = (xPositions[closestIdx] || 0) + margin.left;
        setTooltip({
          dataPoint: data[closestIdx],
          xLabel: domain[closestIdx],
          x: xPos,
          y: event.clientY - rect.top - 10,
        });
      });

      overlay.on('mouseleave', () => setTooltip(null));
    }
  }, [data, series, dimensions, margin, xKey, gridDash, gridColor, gridVertical, tickFontSize, tickColor, yTickFormatter, rightYTickFormatter, referenceLines, renderTooltip, curveType]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      {tooltip && renderTooltip && (
        <div
          className="absolute pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {renderTooltip(tooltip.dataPoint, tooltip.xLabel)}
        </div>
      )}
    </div>
  );
}
