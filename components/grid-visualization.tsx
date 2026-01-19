"use client";

import React from "react"

import { useEffect, useRef, useState } from "react";
import type { CellData } from "@/lib/dice-analyzer";

interface GridVisualizationProps {
  imageUrl: string;
  cells: CellData[];
  gridSize: number;
  a1: number;
  a2: number;
}

export function GridVisualization({ imageUrl, cells, gridSize, a1, a2 }: GridVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Calculate display size maintaining aspect ratio
      const containerWidth = container.clientWidth;
      const aspectRatio = img.width / img.height;
      const displayWidth = Math.min(containerWidth, 800);
      const displayHeight = displayWidth / aspectRatio;

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      setDimensions({ width: displayWidth, height: displayHeight });

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Calculate cell dimensions
      const cellWidth = displayWidth / gridSize;
      const cellHeight = displayHeight / gridSize;

      // Draw grid and highlight cells outside interval
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;

      for (const cell of cells) {
        const x = cell.col * cellWidth;
        const y = cell.row * cellHeight;

        // Highlight cells outside interval
        if (!cell.inInterval) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.4)"; // red with transparency
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }

        // Draw grid lines
        ctx.strokeRect(x, y, cellWidth, cellHeight);
      }

      // Draw legend
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(10, displayHeight - 60, 200, 50);
      ctx.fillStyle = "white";
      ctx.font = "12px sans-serif";
      ctx.fillText("Сетка ячеек:", 20, displayHeight - 40);
      
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
      ctx.fillRect(20, displayHeight - 30, 16, 16);
      ctx.fillStyle = "white";
      ctx.fillText("Вне интервала [A1, A2]", 42, displayHeight - 18);
    };
    img.src = imageUrl;
  }, [imageUrl, cells, gridSize, a1, a2]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const rect = canvas.getBoundingClientRect();
    
    // Scale mouse coordinates to match the canvas's intrinsic resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setMousePos({ x: e.clientX, y: e.clientY });

    const cellWidth = dimensions.width / gridSize;
    const cellHeight = dimensions.height / gridSize;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      const cell = cells.find((c) => c.row === row && c.col === col);
      setHoveredCell(cell || null);
    } else {
      setHoveredCell(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-auto rounded-lg border border-border cursor-crosshair"
      />
      
      {hoveredCell && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          <p className="text-sm font-medium text-foreground">
            Ячейка [{hoveredCell.row + 1}, {hoveredCell.col + 1}]
          </p>
          <p className="text-sm text-muted-foreground">
            Яркость: {hoveredCell.brightness.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">
            Концентрация: {hoveredCell.concentration.toFixed(2)}%
          </p>
          <p className={`text-sm font-medium ${hoveredCell.inInterval ? "text-green-500" : "text-red-500"}`}>
            {hoveredCell.inInterval ? "В интервале [A1, A2]" : "Вне интервала"}
          </p>
        </div>
      )}
    </div>
  );
}
