import { useEffect, useRef } from "react";

const CyberSpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Stars
    const stars: Array<{ x: number; y: number; size: number; speed: number; opacity: number }> = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }

    // Grid lines
    const gridLines: Array<{ 
      x1: number; 
      y1: number; 
      x2: number; 
      y2: number; 
      opacity: number; 
      speed: number;
      isHorizontal: boolean;
    }> = [];
    
    for (let i = 0; i < 20; i++) {
      const isHorizontal = Math.random() > 0.5;
      gridLines.push({
        x1: isHorizontal ? 0 : Math.random() * canvas.width,
        y1: isHorizontal ? Math.random() * canvas.height : 0,
        x2: isHorizontal ? canvas.width : Math.random() * canvas.width,
        y2: isHorizontal ? Math.random() * canvas.height : canvas.height,
        opacity: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 0.3 + 0.1,
        isHorizontal,
      });
    }

    // Animation loop
    let animationFrameId: number;
    
    const animate = () => {
      ctx.fillStyle = "rgba(13, 17, 23, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update stars
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${star.opacity})`;
        ctx.fill();

        // Move stars
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }

        // Twinkle effect
        star.opacity += (Math.random() - 0.5) * 0.02;
        star.opacity = Math.max(0.3, Math.min(1, star.opacity));
      });

      // Draw and update grid lines
      gridLines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 200, 255, ${line.opacity})`;
        ctx.lineWidth = 1;
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();

        // Pulse effect
        line.opacity += (Math.random() - 0.5) * 0.01;
        line.opacity = Math.max(0.05, Math.min(0.4, line.opacity));

        // Move grid lines slowly
        if (line.isHorizontal) {
          line.y1 += line.speed;
          line.y2 += line.speed;
          if (line.y1 > canvas.height) {
            line.y1 = 0;
            line.y2 = 0;
          }
        } else {
          line.x1 += line.speed;
          line.x2 += line.speed;
          if (line.x1 > canvas.width) {
            line.x1 = 0;
            line.x2 = 0;
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Static gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-[hsl(220,25%,10%)] to-background -z-10" />
      
      {/* Animated canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 opacity-70"
        style={{ background: "transparent" }}
      />
      
      {/* Grid overlay */}
      <div className="fixed inset-0 -z-10 opacity-20" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
      }} />
      
      {/* Radial glow effect */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
    </>
  );
};

export default CyberSpaceBackground;
