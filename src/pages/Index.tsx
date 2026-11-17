import { Link } from "react-router-dom";
import { Shield, Activity, ArrowUpRight, HeartPulse, Users, Radio, Siren, Building2, Ambulance, ClipboardCheck } from "lucide-react";
import { HeroScene3D } from "@/components/wakanda/HeroScene3D";
import { TiltCard, Reveal, Marquee, CountUp, CursorGlow, ScrollProgress, usePointerParallax } from "@/components/wakanda/ui";
import { ShuriFeature } from "@/components/wakanda/Shuri";
import { HexBanner } from "@/components/wakanda/HexBanner";

const MODULES = [
  { icon: Users, title: "Care command", text: "Coordinate clinical queues and prioritize attention.", url: "/opd-queue", img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=70" },
  { icon: HeartPulse, title: "Recovery watch", text: "Patient check-ins and monitoring in a shared view.", url: "/post-op", img: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=70" },
  { icon: Activity, title: "Intelligence archive", text: "Review patient reports and recorded analyses.", url: "/reports", img: "/images/shuri-vision.jpg", face: true },
];
const STEPS = [
  { icon: Siren, t: "SOS raised", d: "Staff log the case, priority, location and the beds, ICU, oxygen or blood it needs." },
  { icon: Building2, t: "Hospitals matched", d: "Only facilities with the real capacity qualify, ranked by distance and ER load." },
  { icon: Ambulance, t: "Quinjet dispatched", d: "A human confirms. Resources are reserved atomically and the nearest unit rolls." },
  { icon: ClipboardCheck, t: "Arrival & release", d: "Advance to arrival, confirm discharge, and reusable resources return to the pool." },
];

export default function Index() {
  const heroRef = usePointerParallax<HTMLElement>();
  return (
    <main className="wk landing">
      <CursorGlow /><ScrollProgress />
      <div className="wk-bg" aria-hidden="true"><i className="aurora a1" /><i className="aurora a2" /><i className="hexfield" /><i className="scan" /></div>

      <nav className="l-nav">
        <Link to="/about" className="wk-brand"><span className="wk-glyph"><svg viewBox="0 0 40 44"><path d="M20 2 37 11v18L20 42 3 29V11Z" /><path d="M11 14l9 5 9-5-3 13-6 6-6-6Z" /></svg></span><b>VISION</b><em>.</em></Link>
        <span className="l-nav-mid">WAKANDA EMERGENCY COUNCIL</span>
        <Link to="/login" className="btn ghost">Access command <ArrowUpRight size={14} /></Link>
      </nav>

      <section className="l-hero" ref={heroRef}>
        <HeroScene3D className="l-3d" shift={0} />
        <div className="hero-shade l" />
        <div className="l-copy">
          <div className="tag"><span /> RESILIENCE INITIATIVE / 03</div>
          <h1>Every second.<br />Every life.<br /><em>Within vision.</em></h1>
          <p>A unified healthcare command network. Bring patient monitoring, clinical queues and emergency intelligence into one field of view.</p>
          <div className="hero-actions">
            <Link to="/" className="btn primary glow">Enter command centre <ArrowUpRight size={18} /></Link>
            <Link to="/patient" className="btn ghost">Patient portal →</Link>
          </div>
          <div className="hero-cap"><Radio size={14} /> VISION SYSTEMS ONLINE <span>HUMAN OVERSIGHT. ALWAYS.</span></div>
        </div>
        <div className="l-figure"><div className="halo" /><img src="/images/black-panther-cutout.png" alt="Black Panther — Wakanda’s protector" /></div>
        <div className="l-stats">
          {[["3", "Partner hospitals"], ["3", "Quinjet units"], ["4", "Step dispatch flow"], ["100", "% human confirmed"]].map(([n, l]) => (
            <div key={l}><strong><CountUp value={Number(n)} /></strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      <Marquee items={["WAKANDA FOREVER", "VIBRANIUM CORE ACTIVE", "EXPLAINABLE ALLOCATION", "HUMAN CONFIRMED · ML ASSISTED", "TRANSACTIONAL RESOURCE RESERVATION", "ONE NETWORK. EVERY RESOURCE. EVERY LIFE."]} />

      <section className="l-section"><Reveal><HexBanner /></Reveal></section>

      <section className="l-section">
        <Reveal><span className="micro holo">01 / ACTIVE MODULES</span><h2>One network. Three fields of view.</h2></Reveal>
        <div className="l-cards">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delay={i * 110}>
              <TiltCard as={Link} to={m.url} className={"gcard tall " + (m.face ? "face" : "")}>
                <img src={m.img} alt="" loading="lazy" referrerPolicy="no-referrer" />
                <span className="gshade" />
                <span className="gtxt"><small><m.icon size={14} /> 0{i + 1} / ACTIVE MODULE</small><b>{m.title}</b><em>{m.text}</em></span>
                <ArrowUpRight className="garrow" size={18} />
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="l-section">
        <Reveal><span className="micro holo">02 / THE DISPATCH LOOP</span><h2>From SOS to safe arrival.</h2></Reveal>
        <div className="l-steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 110}>
              <TiltCard className="step" max={7}>
                <span className="step-n">0{i + 1}</span>
                <s.icon size={26} />
                <b>{s.t}</b>
                <p>{s.d}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="l-section">
        <Reveal><span className="micro holo">03 / DEMO SCENARIO</span><h2>The closest hospital is not always <em>the best fit.</em></h2></Reveal>
        <Reveal>
          <div className="l-table" role="table" aria-label="Seeded demo: request of 1 ICU and 1 ventilator">
            <div className="lt-head" role="row"><span>Facility</span><span>Distance</span><span>ER load</span><span>Resource fit</span><span>Heuristic</span></div>
            {[["Wakanda Central", "0.00 km", "16 / 20", "Eligible", "9.60", "ok"], ["Stark Medical Centre", "1.93 km", "7 / 20", "Eligible", "8.06", "ok"], ["Shuri Regional", "2.64 km", "18 / 20", "No ICU / vent", "Excluded", "bad"]].map((r) => (
              <div className={"lt-row " + r[5]} role="row" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span><span className="fit">{r[3]}</span><span>{r[4]}</span></div>
            ))}
            <p>Capacity gates first. Distance and ER load rank the eligible options. <b>Staff chooses.</b> Illustrative case from the seeded facility state.</p>
          </div>
        </Reveal>
      </section>

      <section className="l-section">
        <Reveal><span className="micro holo">04 / MULTIMODAL INTELLIGENCE</span><h2>Three signals. <em>One disclosed advisory score.</em></h2></Reveal>
        <div className="l-signals">
          {[["60", "Measured vitals", "Heart rate, blood pressure, SpO₂, temperature, pain and fatigue."], ["20", "Face image / video", "Trained face model; input quality and availability are checked."], ["20", "Voice recording", "Trained voice model; absent speech is excluded."]].map(([w, t, d], i) => (
            <Reveal key={t} delay={i * 110}>
              <TiltCard className="sig" max={7}>
                <div className="sig-ring" style={{ ["--w" as string]: w }}><b>{w}%</b></div>
                <h3>{t}</h3><small>BASE WEIGHT</small><p>{d}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="l-note">Missing signals are excluded and usable weights renormalised. Staff still confirms every dispatch.</p></Reveal>
      </section>

      <section className="l-section">
        <Reveal><ShuriFeature /></Reveal>
      </section>

      <section className="l-section">
        <Reveal><span className="micro holo">06 / LIVE CITY HOLOGRAM</span><h2>Delhi, <em>seen from Wakanda.</em></h2></Reveal>
        <Reveal>
          <div className="l-holo holo-border">
            <HeroScene3D className="l-holo-3d" intensity={1.1} />
            <i className="br tl" /><i className="br tr" /><i className="br bl" /><i className="br brr" />
            <div className="l-holo-hud top"><span><i /> SECTOR 07 / DELHI</span><span>VIBRANIUM GRID · LIVE</span></div>
            <div className="hcard h1"><small>NETWORK ER LOAD</small><b>68%</b><span>3 facilities</span></div>
            <div className="hcard h2"><small>QUINJETS READY</small><b>3/3</b><span>nearest in 2 min</span></div>
            <div className="hcard h3"><small>ALLOCATION</small><b>EXPLAINABLE</b><span>human confirmed</span></div>
          </div>
        </Reveal>
      </section>

      <footer className="l-foot"><Shield size={16} /> PROJECT VISION · PREPAREDNESS THROUGH COORDINATION <span>MARVEL-INSPIRED CONCEPT / DEMONSTRATION SYSTEM · SYNTHETIC DATA ONLY</span></footer>
    </main>
  );
}
