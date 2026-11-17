import { Link } from "react-router-dom";
import { ArrowUpRight, Cpu, ShieldCheck, Sparkles } from "lucide-react";
import { TiltCard } from "./ui";

/** Holographic portrait frame — corner brackets, sweeping scan line, floating data tags. */
export function ShuriPortrait({ className = "" }: { className?: string }) {
  return (
    <TiltCard className={"shuri-frame holo-border " + className} max={8}>
      <img src="/images/shuri-vision.jpg" alt="Shuri — Wakanda Design Group" loading="lazy" />
      <span className="sf-tint" />
      <span className="sf-scan" />
      <i className="br tl" /><i className="br tr" /><i className="br bl" /><i className="br brr" />
      <span className="sf-tag t1"><Cpu size={12} /> VIBRANIUM LAB · ONLINE</span>
      <span className="sf-tag t2"><Sparkles size={12} /> INNOVATION INDEX <b>98</b></span>
      <span className="sf-name"><small>WAKANDA DESIGN GROUP</small><b>SHURI</b></span>
    </TiltCard>
  );
}

/** Compact Command-centre banner. */
export function ShuriBanner({ onGo }: { onGo: () => void }) {
  return (
    <section className="shuri-banner holo-border">
      <div className="sb-portrait"><ShuriPortrait /></div>
      <div className="sb-copy">
        <span className="micro holo">WAKANDA DESIGN GROUP · PRINCESS SHURI</span>
        <h3>Brilliant tech. <em>Human care.</em></h3>
        <p>Shuri’s lab keeps the network sharp — explainable allocation, verified capacity and a human on every dispatch.</p>
        <div className="sb-pills"><span><ShieldCheck size={13} /> Human confirmed</span><span><Cpu size={13} /> ML assisted</span><span><Sparkles size={13} /> Explainable</span></div>
        <button className="btn ghost" onClick={onGo}>Coordinate response <ArrowUpRight size={14} /></button>
      </div>
    </section>
  );
}

/** Landing feature block. */
export function ShuriFeature() {
  return (
    <div className="shuri-feature">
      <ShuriPortrait />
      <div className="sf-copy">
        <span className="micro holo">05 / WAKANDA DESIGN GROUP</span>
        <h2>Shuri builds the future <em>of care.</em></h2>
        <p>Wakanda’s brightest mind turns vibranium-grade engineering into a calmer emergency response — every hospital, ambulance and clinician in one auditable command layer.</p>
        <ul>
          <li><b>01</b> Explainable allocation <small>No black boxes — every ranking shows why.</small></li>
          <li><b>02</b> Atomic reservations <small>Beds, ICU, oxygen and blood locked in one step.</small></li>
          <li><b>03</b> Human in command <small>Staff confirm every dispatch. Always.</small></li>
        </ul>
        <Link to="/" className="btn primary glow">Open mission control <ArrowUpRight size={16} /></Link>
      </div>
    </div>
  );
}
