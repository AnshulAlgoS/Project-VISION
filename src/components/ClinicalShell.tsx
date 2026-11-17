import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { TiltCard, CursorGlow, ScrollProgress } from "@/components/wakanda/ui";

const TITLES: Record<string, string[]> = {
  "/patient": ["Patient check-in", "One check-in. A clearer picture."],
  "/post-op": ["Model monitoring", "Multimodal signals. Human oversight."],
  "/opd-queue": ["Clinical queue", "Give attention where it matters."],
  "/reports": ["Model reports", "Every signal, in one place."],
};

export function ClinicalShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const title = TITLES[location.pathname] || ["Clinical support", "Connected care, coordinated."];
  return (
    <div className="clinical-site wk">
      <CursorGlow /><ScrollProgress />
      <div className="wk-bg" aria-hidden="true"><i className="aurora a1" /><i className="aurora a2" /><i className="hexfield" /><i className="scan" /></div>
      <nav className="clinical-nav">
        <Link className="wk-brand" to="/about"><span className="wk-glyph"><svg viewBox="0 0 40 44"><path d="M20 2 37 11v18L20 42 3 29V11Z" /><path d="M11 14l9 5 9-5-3 13-6 6-6-6Z" /></svg></span><b>VISION</b><em>.</em></Link>
        <div>
          {[["/", "Mission control"], ["/patient", "Patient check-in"], ["/post-op", "Model monitoring"], ["/opd-queue", "Clinical queue"], ["/reports", "Model reports"]].map(([url, label]) => (
            <Link className={location.pathname === url ? "current" : ""} key={url} to={url}>{label}</Link>
          ))}
        </div>
        <span><ShieldCheck size={16} /> CLINICAL SUPPORT</span>
      </nav>
      <div className="clinical-breadcrumb">VISION NETWORK <span>/</span> HEALTHCARE INTELLIGENCE <ArrowUpRight size={15} /></div>
      <TiltCard as="section" className="clinical-hero" max={2}>
        <div>
          <p>WAKANDA HEALTH NETWORK / VISION INTELLIGENCE</p>
          <h1>{title[0]}</h1>
          <span>{title[1]}</span>
        </div>
        <div className="clinical-figure"><div className="halo" /><img src="/images/black-panther-cutout.png" alt="Black Panther — Wakanda’s protector" /></div>
      </TiltCard>
      <div className="tab-in" key={location.pathname}>{children}</div>
    </div>
  );
}
