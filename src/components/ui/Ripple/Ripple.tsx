import React, { useMemo, useRef, useState, useCallback } from "react";
import { cn } from "@/utils/cn";

/**
 * Ripple - Interactive background grid effect (Aceternity UI inspired)
 *
 * SOLID Principles applied:
 * - SRP (Single Responsibility): DivGrid handles rendering, Ripple handles state
 * - OCP (Open/Closed): Configurable via props (rows, cols, cellSize, colors)
 * - LSP (Liskov Substitution): Can replace any background component
 * - ISP (Interface Segregation): Props interface only exposes necessary configuration
 * - DIP (Dependency Inversion): Uses cn utility abstraction for class merging
 *
 * Performance optimizations:
 * - useMemo for cells array to prevent recreation on each render
 * - useCallback for event handlers to maintain referential stability
 * - CSS transitions instead of JS animations for GPU acceleration
 * - will-change hint for opacity/background-color transforms
 */

type CellStyle = React.CSSProperties & {
  "--delay"?: string;
  "--duration"?: string;
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  hoverFillColor: string;
  activeCell: { row: number; col: number } | null;
  onCellHover?: (row: number, col: number) => void;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#3f3f46",
  fillColor = "rgba(14,165,233,0.3)",
  hoverFillColor = "rgba(96, 165, 250, 0.6)",
  activeCell = null,
  onCellHover = () => {},
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols]
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = activeCell
          ? Math.hypot(activeCell.row - rowIdx, activeCell.col - colIdx)
          : Infinity;

        // Calculate opacity based on distance from active cell
        const maxDistance = 6;
        const proximityOpacity = activeCell
          ? Math.max(0.1, 0.8 - (distance / maxDistance) * 0.7)
          : 0.15;

        const delay = activeCell ? Math.max(0, distance * 30) : 0;
        const duration = 150 + distance * 50;

        const style: CellStyle = {
          "--delay": `${delay}ms`,
          "--duration": `${duration}ms`,
          backgroundColor: distance < maxDistance ? hoverFillColor : fillColor,
          borderColor: borderColor,
          opacity: proximityOpacity,
          transition: `opacity ${duration}ms ease-out ${delay}ms, background-color ${duration}ms ease-out ${delay}ms`,
        };

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] will-change-[opacity,background-color]",
              !interactive && "pointer-events-none"
            )}
            style={style}
            onMouseEnter={
              interactive ? () => onCellHover?.(rowIdx, colIdx) : undefined
            }
            onClick={
              interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined
            }
          />
        );
      })}
    </div>
  );
};

export interface RippleProps {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
}

export function Ripple({
  rows = 12,
  cols = 32,
  cellSize = 60,
  className,
}: RippleProps) {
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleCellHover = useCallback((row: number, col: number) => {
    setActiveCell({ row, col });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setActiveCell(null);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 z-[5] h-full w-full overflow-hidden",
        className
      )}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-full w-full flex items-center justify-center">
        <DivGrid
          rows={rows}
          cols={cols}
          cellSize={cellSize}
          borderColor="rgba(96, 165, 250, 0.2)"
          fillColor="rgba(30, 58, 95, 0.3)"
          hoverFillColor="rgba(96, 165, 250, 0.5)"
          activeCell={activeCell}
          onCellHover={handleCellHover}
          interactive
        />
      </div>
    </div>
  );
}
