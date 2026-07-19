import bg from "@/assets/realistic-space-bg.jpg";
import { useEffect, useRef } from "react";

const RealisticSpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Pointer state for engagement
    const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, active: false, vx: 0, vy: 0 };
    const ripples: { x: number; y: number; r: number; life: number; hue: number }[] = [];

    type Star = { x: number; y: number; r: number; a: number; s: number; tw: number };
    type Dust = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    type Shoot = { x: number; y: number; vx: number; vy: number; life: number; len: number };

    let stars: Star[] = [];
    let dust: Dust[] = [];
    let shooters: Shoot[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starCount = Math.floor((w * h) / 4500);
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.8 + 0.2,
        s: Math.random() * 0.5 + 0.1,
        tw: Math.random() * Math.PI * 2,
      }));

      const dustCount = Math.floor((w * h) / 12000);
      dust = Array.from({ length: dustCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.35 + 0.1,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      pointer.vx = nx - pointer.x;
      pointer.vy = ny - pointer.y;
      pointer.x = nx;
      pointer.y = ny;
      pointer.active = true;
      // parallax the bg image subtly
      if (imgRef.current) {
        const dx = (nx / w - 0.5) * -20;
        const dy = (ny / h - 0.5) * -20;
        imgRef.current.style.transform = `scale(1.08) translate(${dx}px, ${dy}px)`;
      }
    };
    const onLeave = () => { pointer.active = false; pointer.x = -9999; pointer.y = -9999; };
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        r: 4,
        life: 1,
        hue: 190 + Math.random() * 80,
      });
      // spawn a burst of shooting stars from click
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 4;
        shooters.push({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          len: Math.random() * 50 + 40,
        });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);

    const spawnShooter = () => {
      const fromLeft = Math.random() > 0.5;
      const angle = (Math.random() * 0.3 + 0.15) * Math.PI;
      const speed = Math.random() * 6 + 6;
      shooters.push({
        x: fromLeft ? -50 : w + 50,
        y: Math.random() * h * 0.6,
        vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        len: Math.random() * 80 + 60,
      });
    };

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      ctx.clearRect(0, 0, w, h);

      // nebula glow pulses
      const t = now / 4000;
      const g1 = ctx.createRadialGradient(w * 0.25, h * 0.35, 0, w * 0.25, h * 0.35, w * 0.5);
      g1.addColorStop(0, `hsla(265, 80%, 55%, ${0.12 + Math.sin(t) * 0.04})`);
      g1.addColorStop(1, "hsla(265, 80%, 55%, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 0, w * 0.8, h * 0.7, w * 0.55);
      g2.addColorStop(0, `hsla(195, 90%, 55%, ${0.1 + Math.cos(t * 0.8) * 0.04})`);
      g2.addColorStop(1, "hsla(195, 90%, 55%, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // cursor aurora — reactive nebula that follows the pointer
      if (pointer.active) {
        const cg = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 260);
        cg.addColorStop(0, "hsla(180, 100%, 70%, 0.28)");
        cg.addColorStop(0.5, "hsla(220, 100%, 60%, 0.12)");
        cg.addColorStop(1, "hsla(220, 100%, 60%, 0)");
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, w, h);
      }

      // dust drift + pointer repulsion
      ctx.fillStyle = "#ffffff";
      for (const d of dust) {
        if (pointer.active) {
          const ddx = d.x - pointer.x;
          const ddy = d.y - pointer.y;
          const dist2 = ddx * ddx + ddy * ddy;
          if (dist2 < 22500) {
            const f = (1 - dist2 / 22500) * 0.6;
            const dist = Math.sqrt(dist2) || 1;
            d.vx += (ddx / dist) * f;
            d.vy += (ddy / dist) * f;
          }
        }
        d.vx *= 0.96;
        d.vy *= 0.96;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x < 0) d.x = w; else if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; else if (d.y > h) d.y = 0;
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // twinkling stars — brighten near cursor
      for (const s of stars) {
        s.tw += 0.03 * s.s * dt;
        const tw = 0.55 + Math.sin(s.tw) * 0.45;
        let boost = 1;
        if (pointer.active) {
          const dx = s.x - pointer.x;
          const dy = s.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 40000) boost = 1 + (1 - d2 / 40000) * 1.6;
        }
        ctx.globalAlpha = Math.min(1, s.a * tw * boost);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (boost > 1.3 ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1 || boost > 1.3) {
          ctx.globalAlpha = Math.min(0.6, s.a * tw * 0.3 * boost);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3 * boost, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // click ripples
      ctx.globalAlpha = 1;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 3.5 * dt;
        r.life -= 0.02 * dt;
        ctx.strokeStyle = `hsla(${r.hue}, 100%, 70%, ${r.life})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        if (r.life <= 0) ripples.splice(i, 1);
      }

      // shooting stars
      if (Math.random() < 0.006) spawnShooter();
      shooters = shooters.filter((sh) => {
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.life -= 0.008 * dt;
        const tailX = sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * sh.len;
        const tailY = sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * sh.len;
        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, `hsla(200, 100%, 85%, ${sh.life})`);
        grad.addColorStop(1, "hsla(200, 100%, 85%, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        return sh.life > 0 && sh.x > -100 && sh.x < w + 100 && sh.y < h + 100;
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <img
        ref={imgRef}
        src={bg}
        alt="Realistic deep space cosmic nebula"
        className="absolute inset-0 w-full h-full object-cover animate-[kenburns_40s_ease-in-out_infinite_alternate] transition-transform duration-[600ms] ease-out"
        loading="lazy"
        width={1920}
        height={1280}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/20 to-background/40" />
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_50%,transparent_40%,hsl(var(--background)/0.5)_100%)]" />
      <style>{`@keyframes kenburns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.1) translate(-2%,-2%)}}`}</style>
    </div>
  );
};

export default RealisticSpaceBackground;
