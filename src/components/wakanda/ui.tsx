import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/** 3D tilt card with holographic glare that follows the pointer. */
export function TiltCard({
  children,
  className = "",
  as: Tag = "div",
  max = 9,
  style,
  ...rest
}: { children: ReactNode; className?: string; as?: ElementType; max?: number; style?: CSSProperties } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const b = el.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width;
    const py = (e.clientY - b.top) / b.height;
    el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <Tag ref={ref} className={`tilt ${className}`} style={style} onPointerMove={move} onPointerLeave={leave} {...rest}>
      <span className="tilt-glare" aria-hidden="true" />
      {children}
    </Tag>
  );
}

/** Animated number — eases to each new value. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * e));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
}

/** Fades/slides children in when scrolled into view. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${on ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Endless ticker strip. */
export function Marquee({ items }: { items: string[] }) {
  const row = items.map((t, i) => (
    <span key={i}>
      <i /> {t}
    </span>
  ));
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}

/** Tiny SVG sparkline — decorative, deterministic from a seed so cards feel alive. */
export function Spark({ seed = 1, className = "" }: { seed?: number; className?: string }) {
  const pts = Array.from({ length: 14 }, (_, i) => {
    const y = 18 + Math.sin(i * 0.9 + seed * 1.7) * 7 + Math.cos(i * 0.4 + seed) * 5 - i * 0.3;
    return `${(i / 13) * 100},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg className={`spark ${className}`} viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,36 ${pts} 100,36`} className="spark-fill" />
      <polyline points={pts} className="spark-line" />
    </svg>
  );
}

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
