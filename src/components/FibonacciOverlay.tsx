import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

interface FibonacciOverlayProps {
  levels: number[];
  isActive: boolean;
  chartHeight?: number;
  chartWidth?: number;
  swingHigh?: number;
  swingLow?: number;
}

const FibonacciOverlay = ({
  levels,
  isActive,
  chartHeight = 400,
  chartWidth = 600,
  swingHigh = 100,
  swingLow = 0,
}: FibonacciOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, chartWidth, chartHeight);

    // Draw AK-47 style Fibonacci lines with animation
    setIsDrawing(true);
    const priceRange = swingHigh - swingLow;

    levels.forEach((level, index) => {
      setTimeout(() => {
        const yPosition = chartHeight - (level * priceRange / swingHigh) * chartHeight;
        
        // Draw bullet impact effect
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            ctx.beginPath();
            ctx.arc(
              10 + Math.random() * 20,
              yPosition + (Math.random() - 0.5) * 10,
              Math.random() * 3,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.8 - i * 0.15})`;
            ctx.fill();
          }, i * 50);
        }

        // Draw the line with tactical styling
        setTimeout(() => {
          ctx.beginPath();
          ctx.moveTo(0, yPosition);
          ctx.lineTo(chartWidth, yPosition);
          
          // Gradient line effect
          const gradient = ctx.createLinearGradient(0, 0, chartWidth, 0);
          gradient.addColorStop(0, `rgba(255, 50, 0, 0.3)`);
          gradient.addColorStop(0.5, `rgba(255, 100, 0, 0.8)`);
          gradient.addColorStop(1, `rgba(255, 50, 0, 0.3)`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 5]);
          ctx.stroke();

          // Add level label
          ctx.fillStyle = "#ff6600";
          ctx.font = "bold 12px monospace";
          ctx.fillText(
            `${(level * 100).toFixed(1)}%`,
            chartWidth - 60,
            yPosition - 5
          );

          // Add price level
          const price = swingLow + (level * priceRange);
          ctx.fillStyle = "#ff8800";
          ctx.font = "10px monospace";
          ctx.fillText(
            `$${price.toFixed(2)}`,
            chartWidth - 60,
            yPosition + 12
          );

        }, 100);

      }, index * 200);
    });

    setTimeout(() => setIsDrawing(false), levels.length * 200 + 500);
  }, [isActive, levels, chartHeight, chartWidth, swingHigh, swingLow]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={chartWidth}
        height={chartHeight}
        className="w-full h-full"
      />
      {isDrawing && (
        <Card className="absolute top-4 left-4 p-3 bg-black/90 border-red-600/50 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400 font-mono">
              FIBONACCI SEQUENCE DEPLOYING...
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

export default FibonacciOverlay;
