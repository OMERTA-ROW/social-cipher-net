import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  isActive: boolean;
}

const VoiceWaveform = ({ isActive }: VoiceWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 40;

    let animationFrameId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isActive) {
        ctx.strokeStyle = "hsl(var(--primary))";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const amplitude = 15;
        const frequency = 0.05;
        const bars = 20;

        for (let i = 0; i < bars; i++) {
          const x = (i / bars) * canvas.width;
          const height = Math.abs(Math.sin((i * frequency + phase) * Math.PI) * amplitude);
          
          ctx.fillStyle = `hsla(var(--primary), ${0.5 + (height / amplitude) * 0.5})`;
          ctx.fillRect(x, canvas.height / 2 - height / 2, canvas.width / bars - 2, height);
        }

        phase += 0.1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10 rounded"
      style={{ opacity: isActive ? 1 : 0.3 }}
    />
  );
};

export default VoiceWaveform;
