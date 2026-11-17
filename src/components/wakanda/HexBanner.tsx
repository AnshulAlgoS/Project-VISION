import { TiltCard } from "./ui";

type Cell = { img?: string; title?: string; sub?: string; tone?: "holo" | "gold" | "red" | "violet"; cut?: boolean; pos?: string };

const CELLS: Cell[] = [
  { title: "VISION", sub: "ONE NETWORK.", tone: "holo" },
  { img: "/images/shuri-vision.jpg", pos: "50% 22%", tone: "violet" },
  { title: "EVERY RESOURCE.", sub: "EVERY LIFE.", tone: "gold" },
  { img: "/images/black-panther-cutout.png", cut: true, tone: "holo" },
  { img: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=70", tone: "holo" },
  { img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=70", pos: "50% 30%", tone: "red" },
  { title: "HUMAN", sub: "CONFIRMED · ML ASSISTED", tone: "violet" },
];

/** Comic-poster hexagon mosaic — interlocking bordered panels, like the event banner. */
export function HexBanner() {
  return (
    <section className="hexbanner" aria-label="Project Vision poster">
      <div className="hb-bar"><span>PROJECT VISION</span><span>EMERGENCY HEALTHCARE RESOURCE NETWORK</span><span>HUMAN CONFIRMED. ML ASSISTED.</span></div>
      <div className="hb-grid">
        {CELLS.map((c, i) => (
          <TiltCard key={i} className={"hex " + (c.tone || "holo") + (c.img ? " has-img" : " has-text")} max={10} style={{ ["--i" as string]: i }}>
            <span className="hex-in">
              {c.img && <img src={c.img} alt="" loading="lazy" referrerPolicy="no-referrer" className={c.cut ? "cut" : ""} style={{ objectPosition: c.pos }} />}
              {c.title && <span className="hex-txt"><b>{c.title}</b><small>{c.sub}</small></span>}
            </span>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}
