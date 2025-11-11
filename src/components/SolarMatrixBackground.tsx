import { useEffect, useRef } from "react";

const SolarMatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Matrix rain characters
    const matrixChars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    // Planets data
    const planets = [
      { x: 0.15, y: 0.3, size: 30, color: "#4a9eff", speed: 0.0005, angle: 0, orbitRadius: 150 },
      { x: 0.35, y: 0.5, size: 45, color: "#ff6b35", speed: 0.0003, angle: Math.PI / 2, orbitRadius: 200 },
      { x: 0.65, y: 0.4, size: 35, color: "#ffd93d", speed: 0.0007, angle: Math.PI, orbitRadius: 180 },
      { x: 0.85, y: 0.6, size: 25, color: "#6bcf7f", speed: 0.0009, angle: Math.PI * 1.5, orbitRadius: 120 },
    ];

    // Sun in center
    const sun = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: 60,
    };

    const drawMatrixRain = () => {
      // Semi-transparent black for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0f0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient effect for matrix characters
        const gradient = ctx.createLinearGradient(x, y - fontSize * 20, x, y);
        gradient.addColorStop(0, "rgba(0, 255, 0, 0)");
        gradient.addColorStop(0.5, "rgba(0, 255, 0, 0.5)");
        gradient.addColorStop(1, "rgba(0, 255, 0, 1)");
        ctx.fillStyle = gradient;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const drawSolarSystem = (time: number) => {
      // Draw sun with glow
      const sunGradient = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.size * 1.5);
      sunGradient.addColorStop(0, "rgba(255, 200, 50, 0.8)");
      sunGradient.addColorStop(0.5, "rgba(255, 150, 50, 0.4)");
      sunGradient.addColorStop(1, "rgba(255, 100, 50, 0)");
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.size * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.size, 0, Math.PI * 2);
      ctx.fill();

      // Draw orbit paths
      ctx.strokeStyle = "rgba(100, 100, 255, 0.1)";
      ctx.lineWidth = 1;
      planets.forEach(planet => {
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, planet.orbitRadius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw and animate planets
      planets.forEach(planet => {
        planet.angle += planet.speed;
        const x = sun.x + Math.cos(planet.angle) * planet.orbitRadius;
        const y = sun.y + Math.sin(planet.angle) * planet.orbitRadius;

        // Planet glow
        const planetGradient = ctx.createRadialGradient(x, y, 0, x, y, planet.size * 1.3);
        planetGradient.addColorStop(0, planet.color);
        planetGradient.addColorStop(0.7, planet.color + "80");
        planetGradient.addColorStop(1, planet.color + "00");
        ctx.fillStyle = planetGradient;
        ctx.beginPath();
        ctx.arc(x, y, planet.size * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Planet body
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(x, y, planet.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle planet highlight
        const highlightGradient = ctx.createRadialGradient(
          x - planet.size / 3,
          y - planet.size / 3,
          0,
          x,
          y,
          planet.size
        );
        highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(x, y, planet.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    let animationFrame: number;
    let lastTime = 0;

    const animate = (time: number) => {
      drawMatrixRain();
      drawSolarSystem(time);
      animationFrame = requestAnimationFrame(animate);
    };

    animate(0);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      sun.x = canvas.width / 2;
      sun.y = canvas.height / 2;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "linear-gradient(to bottom, #000000, #0a0a1a)" }}
    />
  );
};

export default SolarMatrixBackground;
