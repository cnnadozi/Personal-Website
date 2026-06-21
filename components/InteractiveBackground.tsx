import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { Theme } from "../constants/theme";

export function InteractiveBackground({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // A dot sits in a fixed grid. `homeX/homeY` is where it rests; `x/y` is
    // its live position; `vx/vy` is its velocity. The cursor pushes it away
    // and a spring pulls it home, producing a damped ripple. `glow` (0..1)
    // tracks cursor proximity for brightening and accent tint.
    type Dot = {
      homeX: number;
      homeY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      glow: number;
    };

    // Physics + layout tuning.
    const spacing = 34; // distance between grid dots (px)
    const baseRadius = 1.6; // resting dot radius (px)
    const influence = 150; // cursor effect radius (px)
    const pushStrength = 1.5; // how hard the cursor shoves dots
    const spring = 0.045; // pull back toward home (higher = snappier)
    const damping = 0.86; // velocity decay (lower = more friction)
    const waveAmp = 6; // amplitude of the traveling ambient wave (px)
    const lineMaxDist = spacing * 2.1; // hide mesh lines once stretched too far
    const meshOpacity = 0.38; // global opacity of dots + lines (lower = subtler)

    let dots: Dot[] = [];
    let cols = 0;
    let rows = 0;

    const buildGrid = (w: number, h: number) => {
      dots = [];
      // Inset by half a cell and center the grid so edges look balanced.
      cols = Math.floor(w / spacing);
      rows = Math.floor(h / spacing);
      const offsetX = (w - (cols - 1) * spacing) / 2;
      const offsetY = (h - (rows - 1) * spacing) / 2;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const x = offsetX + c * spacing;
          const y = offsetY + r * spacing;
          dots.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0, glow: 0 });
        }
      }
    };

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      // Size to the canvas's own layout box (the window content area), not the
      // whole viewport, so the mesh fills the macOS window precisely.
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      // Work in CSS pixels; scale the backing store for crisp rendering.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid(w, h);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    // Track size changes of the content area (e.g. window maximize toggle).
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resizeCanvas) : null;
    resizeObserver?.observe(canvas);

    // Start the pointer off-screen so the grid is undisturbed until the user moves.
    const pointer = { x: -9999, y: -9999 };
    const handlePointerMove = (event: PointerEvent) => {
      // Convert viewport coordinates into canvas-local space so distortion
      // tracks the cursor correctly even though the canvas is inset in the window.
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const handlePointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    // Capture phase fires top-down before child elements (text, icons, image,
    // buttons) can swallow the event, so the distortion keeps tracking the
    // cursor even when it's over the card content.
    window.addEventListener("pointermove", handlePointerMove, { capture: true });
    // Only reset when the pointer actually leaves the window, not when it
    // crosses onto a child element inside it.
    document.addEventListener("pointerleave", handlePointerLeave);

    let lastFrame = performance.now();

    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const now = performance.now();
      // Normalize to ~60fps steps and clamp so tab-switches don't explode physics.
      const dt = Math.min((now - lastFrame) / 16.67, 2);
      lastFrame = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const t = now * 0.001;
      const background = theme === "light" ? "#F5F5F5" : "#171717";
      // Monochrome gray; dots/lines brighten (not tint) near the cursor.
      const base = theme === "light" ? [55, 65, 81] : [220, 220, 220];

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      const influenceSq = influence * influence;

      // Disturbance emitters that push the grid like the cursor does. Two of
      // them roam autonomously on Lissajous paths so the field is always in
      // motion; the real pointer (when on screen) is just another emitter.
      const emitters: { x: number; y: number; strength: number }[] = [
        {
          x: w * (0.5 + 0.34 * Math.sin(t * 0.27)),
          y: h * (0.5 + 0.32 * Math.sin(t * 0.21 + 1.3)),
          strength: 0.8,
        },
        {
          x: w * (0.5 + 0.4 * Math.cos(t * 0.19 + 2.1)),
          y: h * (0.5 + 0.28 * Math.cos(t * 0.31)),
          strength: 0.6,
        },
      ];
      if (pointer.x > -9000) {
        emitters.push({ x: pointer.x, y: pointer.y, strength: 1 });
      }

      // --- Physics pass: update every dot's position and glow. ---
      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];

        // Sum repulsion from every emitter; track the strongest proximity for glow.
        let targetGlow = 0;
        for (let e = 0; e < emitters.length; e += 1) {
          const emitter = emitters[e];
          const dx = dot.x - emitter.x;
          const dy = dot.y - emitter.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < influenceSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const falloff = (influence - dist) / influence; // 1 at center -> 0 at edge
            const force = falloff * falloff * pushStrength * emitter.strength;
            dot.vx += (dx / dist) * force * dt;
            dot.vy += (dy / dist) * force * dt;
            targetGlow = Math.max(targetGlow, falloff * emitter.strength);
          }
        }
        // Ease glow toward its target so brightening/fading feels smooth.
        dot.glow += (targetGlow - dot.glow) * Math.min(0.15 * dt, 1);

        // Traveling wave: the rest position rolls on a sine wave whose phase
        // depends on location, so a visible ripple sweeps across the grid.
        const restX = dot.homeX + Math.sin(t * 0.9 + dot.homeX * 0.018 + dot.homeY * 0.01) * waveAmp;
        const restY = dot.homeY + Math.cos(t * 0.8 + dot.homeY * 0.018) * waveAmp;

        // Spring back toward the (drifting) rest point, then damp the velocity.
        dot.vx += (restX - dot.x) * spring * dt;
        dot.vy += (restY - dot.y) * spring * dt;
        dot.vx *= damping;
        dot.vy *= damping;
        dot.x += dot.vx * dt;
        dot.y += dot.vy * dt;
      }

      // --- Mesh pass: connect each dot to its right/down neighbor. ---
      // Lines fade in near the cursor and disappear when stretched too far,
      // so the grid reads as a net that warps around the pointer.
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const i = r * cols + c;
          const dot = dots[i];
          const neighbors = [];
          if (c < cols - 1) neighbors.push(dots[i + 1]);
          if (r < rows - 1) neighbors.push(dots[i + cols]);

          for (let n = 0; n < neighbors.length; n += 1) {
            const nb = neighbors[n];
            const lx = nb.x - dot.x;
            const ly = nb.y - dot.y;
            const len = Math.sqrt(lx * lx + ly * ly);
            if (len > lineMaxDist) continue;

            // Lines stay gray; they only brighten (not tint) near the cursor.
            const glow = Math.max(dot.glow, nb.glow);
            const alpha = (0.04 + glow * 0.32) * meshOpacity;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(${base[0]},${base[1]},${base[2]},${alpha})`;
            ctx.lineWidth = 1;
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
      }

      // --- Dot pass: draw nodes, brightened by displacement + cursor glow. ---
      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        const offX = dot.x - dot.homeX;
        const offY = dot.y - dot.homeY;
        const displacement = Math.sqrt(offX * offX + offY * offY);
        const energy = Math.max(Math.min(displacement / 40, 1), dot.glow);

        const radius = baseRadius + energy * 2.4;
        const alpha = (0.22 + energy * 0.6) * meshOpacity;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${alpha})`;
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove, { capture: true });
      document.removeEventListener("pointerleave", handlePointerLeave);
      resizeObserver?.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [theme]);

  const bgColor = theme === "light" ? "#F5F5F5" : "#171717";

  if (Platform.OS !== "web") {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: bgColor }]}>
      {Platform.OS === "web" && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      )}
    </View>
  );
}
