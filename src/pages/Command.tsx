import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "@/hooks/useApiQuery";
import {
  LayoutDashboard, Radio, Ambulance, Building2, ArrowLeftRight, Activity, ShieldCheck, HeartPulse, BedDouble, Siren, Gauge,
  ArrowUpRight, Stethoscope, FileBarChart2, Users, Home,
} from "lucide-react";
import { HeroScene3D } from "@/components/wakanda/HeroScene3D";
import { TacticalMap3D } from "@/components/wakanda/TacticalMap3D";
import { TiltCard, CountUp, Marquee, Spark, useClock, CursorGlow, ScrollProgress, usePointerParallax } from "@/components/wakanda/ui";
import { ShuriBanner } from "@/components/wakanda/Shuri";
import { HexBanner } from "@/components/wakanda/HexBanner";

type Row = Record<string, any>;

const TABS = ["Overview", "SOS requests", "Dispatch", "Hospitals", "Transfers", "Activity"] as const;
const ICONS: Record<string, any> = { Overview: LayoutDashboard, "SOS requests": Radio, Dispatch: Ambulance, Hospitals: Building2, Transfers: ArrowLeftRight, Activity };

export default function Command() {
  const [s, S] = useState<Row | null>(null);
  const [tab, T] = useState<string>("Overview");
  const [error, E] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, B] = useState(false);
  const [selected, Q] = useState("");
  const [notice, N] = useState("");
  const now = useClock();
  const heroRef = usePointerParallax<HTMLElement>();

  const load = async () => {
    try {
      const r = await fetch(`${API_BASE}/state`);
      if (!r.ok) throw Error("Backend unavailable");
      S(await r.json());
      setConnected(true);
      E(previous => previous.startsWith("Backend unavailable") ? "" : previous);
    } catch {
      setConnected(false);
      E("Backend unavailable. The service may be starting or processing a request; retry shortly.");
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  async function act(path: string, b: Row) {
    B(true);
    E("");
    try {
      const r = await fetch(API_BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      if (!r.headers.get("content-type")?.includes("application/json")) throw Error(`Server unavailable (HTTP ${r.status}). Please retry shortly.`);
      const data = await r.json();
      if (!r.ok) throw Error(data.error || data.detail || "Request failed");
      N("Command confirmed · resources updated");
      await load();
      return true;
    } catch (e) {
      E(String((e as Error).message));
      return false;
    } finally {
      B(false);
    }
  }
  function form(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return Object.fromEntries(new FormData(e.currentTarget));
  }

  const hospitals: Row[] = s?.hospitals || [];
  const cases: Row[] = s?.cases || [];
  const ambulances: Row[] = s?.ambulances || [];
  const hospital = (id: string) => hospitals.find((h: Row) => h.id === id)?.name || "Unassigned";
  const chosen = cases.find((q: Row) => q.id === selected) || cases.find((q: Row) => q.status === "requested");

  const erLoad = hospitals.length ? Math.round((hospitals.reduce((a, h) => a + h.er, 0) / Math.max(1, hospitals.reduce((a, h) => a + h.erCapacity, 0))) * 100) : 0;
  const ready = ambulances.filter((a: Row) => a.status === "available").length;
  const metrics: [string, number, any, string][] = [
    ["Open requests", cases.filter((q: Row) => q.status === "requested").length, Siren, "SOS QUEUE"],
    ["Available ICU", hospitals.reduce((a, h) => a + h.icu, 0), HeartPulse, "CRITICAL CARE"],
    ["Ambulances ready", ready, Ambulance, "QUINJET FLEET"],
    ["Available beds", hospitals.reduce((a, h) => a + h.beds, 0), BedDouble, "REGIONAL NETWORK"],
  ];
  const ticker = [
    "WAKANDA FOREVER",
    ...hospitals.map((h) => `${h.name.toUpperCase()} · ${h.icu} ICU · ${h.beds} BEDS`),
    `NETWORK ER LOAD ${erLoad}%`,
    `${ready}/${ambulances.length || 0} QUINJETS READY`,
    "HUMAN CONFIRMED · ML ASSISTED",
  ];

  return (
    <div className="wk">
      <CursorGlow /><ScrollProgress />
      <div className="wk-bg" aria-hidden="true"><i className="aurora a1" /><i className="aurora a2" /><i className="hexfield" /><i className="scan" /></div>

      <aside className="wk-side">
        <Link className="wk-brand" to="/about"><span className="wk-glyph"><svg viewBox="0 0 40 44"><path d="M20 2 37 11v18L20 42 3 29V11Z" /><path d="M11 14l9 5 9-5-3 13-6 6-6-6Z" /></svg></span><b>VISION</b><em>.</em></Link>
        <p className="micro">EMERGENCY COORDINATION</p>
        <nav aria-label="Command sections">
          {TABS.map((t, i) => {
            const Icon = ICONS[t];
            return (
              <button key={t} className={"wk-nav " + (tab === t ? "active" : "")} aria-current={tab === t ? "page" : undefined} onClick={() => T(t)}>
                <Icon size={16} />
                <span className="lbl">{t}</span>
                <span className="idx">0{i + 1}</span>
              </button>
            );
          })}
        </nav>
        <div className="wk-legacy">
          <p className="micro">CLINICAL SUPPORT</p>
          <Link to="/patient"><Stethoscope size={14} /> Patient check-in</Link>
          <Link to="/post-op"><Activity size={14} /> Model monitoring</Link>
          <Link to="/opd-queue"><Users size={14} /> Clinical queue</Link>
          <Link to="/reports"><FileBarChart2 size={14} /> Model reports</Link>
          <Link to="/about"><Home size={14} /> Project overview</Link>
        </div>
        <small>LOCAL DEMO<br />Simulated Delhi facilities &amp; locations.<br />No live emergency services.</small>
      </aside>

      <main className="wk-main">
        <header className="wk-top">
          <div>
            <span className="micro holo">WAKANDA EMERGENCY COUNCIL / PROJECT VISION</span>
            <h1>{tab === "Overview" ? "Mission control" : tab}</h1>
          </div>
          <div className="wk-top-r">
            <span className="wk-clock">{now.toLocaleTimeString([], { hour12: false })}</span>
            <span className={"wk-live " + (!connected ? "off" : "")}><i /> {connected ? "SYSTEMS LIVE" : "CONNECTING"}</span>
          </div>
        </header>

        {error && <div role="alert" className="wk-error">{error}</div>}
        {notice && <div role="status" className="wk-notice">{notice}<button onClick={() => N("")} aria-label="Dismiss">×</button></div>}

        {tab === "Overview" && (
          <>
            <section className="hero" ref={heroRef}>
              <HeroScene3D className="hero-3d" shift={0.2} />
              <div className="hero-shade" />
              <div className="hero-copy">
                <div className="tag"><span /> RESILIENCE INITIATIVE / EMERGENCY NETWORK</div>
                <h2>Protecting life.<br /><em>The Vision way.</em></h2>
                <p>One connected network for patients, hospitals and the heroes who bring them together.</p>
                <div className="hero-actions">
                  <button className="btn primary glow" onClick={() => T("SOS requests")}><Radio size={16} /> INITIATE SOS <ArrowUpRight size={15} /></button>
                  <button className="btn ghost" onClick={() => T("Dispatch")}>OPEN DISPATCH →</button>
                </div>
                <div className="hero-cap"><ShieldCheck size={13} /> HUMAN CONFIRMED. ML ASSISTED.</div>
              </div>
              <div className="hero-figure">
                <div className="halo" />
                <img className="hf-bust" src="/images/shuri-panther-cutout.png" alt="Shuri as Black Panther" />
                <span className="hf-name"><small>WAKANDA DESIGN GROUP</small><b>SHURI</b></span>
                <div className="chip c1"><Gauge size={13} /> NETWORK ER LOAD <b>{erLoad}%</b></div>
                <div className="chip c2"><i /> VIBRANIUM CORE · ACTIVE</div>
                <div className="chip c3"><Ambulance size={13} /> QUINJETS READY <b>{ready}/{ambulances.length || 0}</b></div>
              </div>
            </section>

            <Marquee items={ticker} />
            <HexBanner />

            <ShuriBanner onGo={() => T("Dispatch")} />
          </>
        )}

        <div className="tab-in" key={tab}>
        <div className="metrics stagger">
          {metrics.map(([k, v, Icon, sub], i) => (
            <TiltCard className="metric" key={k}>
              <Icon className="m-ico" size={20} />
              <span>{k}</span>
              <strong><CountUp value={v} /></strong>
              <small>{sub}</small>
              <Spark seed={i + 1} />
            </TiltCard>
          ))}
        </div>

        {tab === "Overview" && (
          <>
            <section className="command-grid stagger">
              <div className="panel">
                <div className="panel-title"><h2>Regional tactical view</h2><span>SIMULATED LOCATIONS</span></div>
                <TacticalMap3D hospitals={hospitals} ambulances={ambulances} cases={cases} />
                <p className="muted">✚ Hospitals · ● Ambulances · Position changes when simulation advances</p>
              </div>
              <div className="panel">
                <div className="panel-title"><h2>Priority intelligence</h2><span>LIVE BRIEF</span></div>
                <p className="muted">Resource-aware recommendations exclude hospitals without the requested beds, equipment or ER capacity. Eligible facilities are ranked by distance and ER load. When assessed, ML risk increases travel-time weighting.</p>
                <div className="brief">
                  {hospitals.filter((h: Row) => h.icu === 0).map((h: Row) => <p key={h.id}>⚠ {h.name}: ICU capacity exhausted</p>)}
                  {hospitals.filter((h: Row) => h.oxygen < 20).map((h: Row) => <p key={h.id}>⚠ {h.name}: oxygen stock low</p>)}
                </div>
                <button className="btn primary glow" onClick={() => T("SOS requests")}>Create emergency request <ArrowUpRight size={14} /></button>
                <p className="muted">Allocation uses an explainable operational heuristic. Existing clinical ML remains available through clinical support; its combined vitals, face and voice score can be attached in Dispatch to inform ranking without changing clinical requirements.</p>
              </div>
            </section>

            <section className="gallery stagger">
              {[
                { img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=70", k: "01 / CARE", t: "Care teams on call", d: "Verified capacity, staffed and ready.", go: () => T("Hospitals") },
                { img: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=70", k: "02 / RESPONSE", t: "Rapid response grid", d: "Nearest eligible hospital in seconds.", go: () => T("Dispatch") },
                { img: "/images/shuri-vision.jpg", k: "03 / INNOVATION", t: "Transfers & mutual aid", d: "Shuri’s lab moves supplies and patients between sites.", go: () => T("Transfers"), face: true },
              ].map((c) => (
                <TiltCard key={c.t} as="button" className={"gcard " + (c.face ? "face" : "")} onClick={c.go} aria-label={c.t}>
                  <img src={c.img} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <span className="gshade" />
                  <span className="gtxt"><small>{c.k}</small><b>{c.t}</b><em>{c.d}</em></span>
                  <ArrowUpRight className="garrow" size={18} />
                </TiltCard>
              ))}
            </section>
          </>
        )}

        {tab === "SOS requests" && (
          <section className="panel">
            <h2>Request emergency assistance</h2>
            <p className="muted">Demo request only. Staff must confirm priority and resource requirements.</p>
            <form
              onSubmit={async (e) => {
                const el = e.currentTarget;
                const b = form(e);
                const ok = await act("/cases", { ...b, requestId: crypto.randomUUID(), lat: Number(b.lat), lng: Number(b.lng), needs: Object.fromEntries(["beds", "icu", "ventilators", "oxygen", "blood"].map((k) => [k, Number(b[k])])) });
                if (ok) { el.reset(); T("Dispatch"); }
              }}
            >
              <div className="form-grid">
                <label>Patient / reference<input name="name" required placeholder="Patient reference" /></label>
                <label>Location / landmark<input name="location" required placeholder="Gate 2, Central district" /></label>
                <label>Staff-assigned priority<select name="urgency"><option value="urgent">Urgent</option><option value="critical">Critical</option><option value="routine">Routine</option></select></label>
                <label>Latitude<input name="lat" type="number" step="any" min="-90" max="90" defaultValue="28.6139" required /></label>
                <label>Longitude<input name="lng" type="number" step="any" min="-180" max="180" defaultValue="77.209" required /></label>
                {["beds", "icu", "ventilators", "oxygen", "blood"].map((k) => (
                  <label key={k}>{k.toUpperCase()} required<input name={k} type="number" min="0" max="10" defaultValue={k === "beds" ? 1 : 0} /></label>
                ))}
              </div>
              <label>Handover notes<textarea name="note" maxLength={500} placeholder="Authorised assessment / access instructions" /></label>
              <button disabled={busy} className="btn primary glow">Submit SOS request →</button>
            </form>
          </section>
        )}

        {tab === "Dispatch" && (
          <section className="command-grid">
            <div className="panel">
              <h2>Emergency queue</h2>
              {!cases.length && <p className="muted">No requests yet. Create an SOS to start.</p>}
              {[...cases]
                .sort((a: Row, b: Row) => ["critical", "urgent", "routine"].indexOf(a.urgency) - ["critical", "urgent", "routine"].indexOf(b.urgency) || (b.model?.risk_score || 0) - (a.model?.risk_score || 0))
                .map((q: Row) => (
                  <div className={"case " + q.urgency + " " + (chosen?.id === q.id ? "selected" : "")} key={q.id}>
                    <button className="case-select" onClick={() => Q(q.id)}>
                      <b>{q.name}</b><span className={"badge " + q.urgency}>{q.urgency}</span>
                      <p>{q.location}</p>
                      <small>{q.status} · {hospital(q.hospitalId)}</small>
                    </button>
                    {["dispatched", "transporting"].includes(q.status) && (
                      <>
                        <progress max={100} value={q.progress} />
                        <button className="btn ghost" disabled={busy} onClick={() => act("/advance", { caseId: q.id })}>Advance simulated ambulance +25%</button>
                      </>
                    )}
                    {q.status === "arrived" && <button className="btn ghost" disabled={busy} onClick={() => act("/discharge", { caseId: q.id })}>Confirm discharge / release reusable resources</button>}
                  </div>
                ))}
            </div>
            <div className="panel">
              <h2>ML-assisted allocation</h2>
              {chosen?.status === "requested" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const body = new FormData();
                    const vitals = Object.fromEntries(["heart_rate", "bp_systolic", "bp_diastolic", "spo2", "temperature", "pain_level", "fatigue_level"].map((k) => [k, Number(fd.get(k))]));
                    body.append("vitals", JSON.stringify(vitals));
                    for (const k of ["face_video", "voice_sample"]) {
                      const f = fd.get(k);
                      if (f instanceof File && f.size) body.append(k, f);
                    }
                    B(true);
                    E("");
                    fetch(API_BASE + "/assess-multimodal?caseId=" + encodeURIComponent(chosen.id), { method: "POST", body })
                      .then(async (r) => {
                        if (!r.headers.get("content-type")?.includes("application/json")) throw Error(`Analysis server unavailable (HTTP ${r.status}). Please retry shortly.`);
                        const x = await r.json();
                        if (!r.ok) throw Error(x.error || x.detail || "Assessment failed");
                        Q(chosen.id);
                        N("Multimodal assessment attached · ranking updated");
                        await load();
                      })
                      .catch((e) => E(e.message))
                      .finally(() => B(false));
                  }}
                >
                  <p className="muted">Upload a face image/video and voice recording with measured vitals. Available trained model signals inform allocation; unusable signals are excluded and disclosed. Staff confirms dispatch.</p>
                  <div className="form-grid">
                    {([["heart_rate", 80], ["bp_systolic", 120], ["bp_diastolic", 80], ["spo2", 98], ["temperature", 37], ["pain_level", 0], ["fatigue_level", 0]] as [string, number][]).map(([k, v]) => (
                      <label key={k}>{k.replace(/_/g, " ")}<input name={k} type="number" step="any" defaultValue={v} required /></label>
                    ))}
                  </div>
                  <div className="form-grid">
                    <label>Face image / video<input type="file" name="face_video" accept="image/*,video/*" /></label>
                    <label>Voice recording<input type="file" name="voice_sample" accept="audio/*" /></label>
                  </div>
                  <button disabled={busy} className="btn primary glow">{busy ? "Analysing model signals…" : "Run multimodal ML & update allocation"}</button>
                </form>
              )}
              {chosen?.model && (
                <p className="brief">
                  Model score {chosen.model.risk_score.toFixed(1)}/100 · {chosen.model.model_used} · Experimental advisory signal; staff confirmation required.
                  {chosen.model.signals?.map((x: Row) => <span style={{ display: "block" }} key={x.modality}>{x.modality}: {x.score.toFixed(1)} · weight {(x.normalized_weight * 100).toFixed(0)}%</span>)}
                  {Object.entries(chosen.model.excluded || {}).map(([k, v]) => <span style={{ display: "block" }} key={k}>{k}: excluded — {String(v)}</span>)}
                </p>
              )}
              {chosen ? (
                <>
                  <p className="muted">{chosen.name} · {Object.entries(chosen.needs).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${v} ${k}`).join(" / ")}</p>
                  {chosen.recommendations.map((r: Row) => (
                    <div className={"recommend " + (r.eligible ? "" : "off")} key={r.hospitalId}>
                      <div><b>{r.name}</b><span className={"badge " + (r.eligible ? "ok" : "critical")}>{r.eligible ? "ELIGIBLE" : "UNAVAILABLE"}</span></div>
                      <p>{r.reason}</p>
                      <small>Estimated travel {r.eta} min · heuristic score {r.score}</small>
                      <button disabled={busy || !r.eligible || chosen.status !== "requested"} className="btn primary" onClick={() => { Q(chosen.id); act("/dispatch", { caseId: chosen.id, hospitalId: r.hospitalId }); }}>Confirm &amp; dispatch nearest available ambulance</button>
                    </div>
                  ))}
                </>
              ) : (
                <p className="muted">Select a request.</p>
              )}
              <h3>Ambulance fleet</h3>
              {ambulances.map((a: Row) => <p className="fleet" key={a.id}>{a.name}<span className={"st " + a.status}>{a.status} · {a.lat}, {a.lng}</span></p>)}
            </div>
          </section>
        )}

        {tab === "Hospitals" && (
          <div className="hospital-grid">
            {hospitals.map((h: Row) => (
              <TiltCard as="section" className="panel hosp" key={h.id} max={4}>
                <h2>{h.name}</h2>
                <p className="muted">ER occupancy {h.er}/{h.erCapacity}</p>
                <progress value={h.er} max={h.erCapacity} />
                <form
                  onSubmit={(e) => {
                    const b = form(e);
                    act("/resources", { hospitalId: h.id, ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Number(v)])) });
                  }}
                >
                  <div className="form-grid">
                    {["beds", "icu", "ventilators", "oxygen", "blood", "er"].map((k) => (
                      <label key={k}>{k.toUpperCase()} {k === "er" ? "load" : "available"}<input key={h[k]} name={k} type="number" min="0" max={k === "er" ? h.erCapacity : 999} defaultValue={h[k]} required /></label>
                    ))}
                  </div>
                  <button className="btn ghost" disabled={busy}>Save staff-verified capacity</button>
                </form>
              </TiltCard>
            ))}
          </div>
        )}

        {tab === "Transfers" && (
          <section className="command-grid">
            <div className="panel">
              <h2>Coordinate a transfer</h2>
              <form onSubmit={(e) => { const b = form(e); act("/transfers", { ...b, amount: Number(b.amount) }); }}>
                <label>Transfer type<select name="kind"><option value="supply">Medical supply</option><option value="patient">Patient (arrived cases only)</option></select></label>
                <label>Source hospital<select name="source">{hospitals.map((h: Row) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
                <label>Destination hospital<select name="target" defaultValue="h2">{hospitals.map((h: Row) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
                <label>Supply<select name="item"><option>oxygen</option><option>blood</option><option>ventilators</option></select></label>
                <label>Quantity<input name="amount" type="number" min="1" max="100" defaultValue="1" /></label>
                <label>Patient (for patient transfer)<select name="caseId"><option value="">Choose arrived patient</option>{cases.filter((q: Row) => q.status === "arrived").map((q: Row) => <option key={q.id} value={q.id}>{q.name} · {hospital(q.hospitalId)}</option>)}</select></label>
                <button className="btn primary glow" disabled={busy}>Confirm transfer &amp; reserve resources</button>
              </form>
            </div>
            <div className="panel">
              <h2>Transfer ledger</h2>
              {!(s?.transfers || []).length && <p className="muted">No transfers yet.</p>}
              {s?.transfers.map((t: Row) => (
                <div className="recommend" key={t.id}>
                  <b>{t.kind === "patient" ? "Patient transfer" : `${t.amount} ${t.item}`}</b>
                  <p>{hospital(t.source)} → {hospital(t.target)}</p>
                  <span className="badge">{t.status}</span>
                  {t.status === "in_transit" && <button className="btn ghost" disabled={busy} onClick={() => act("/receive", { id: t.id })}>Confirm receipt</button>}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "Activity" && (
          <section className="panel">
            <h2>Command audit trail</h2>
            {s?.events.map((e: Row) => <div className="fleet" key={e.id}><b>{e.action.slice(1)}</b><span>Record {e.record} · {e.id}</span></div>)}
          </section>
        )}

        </div>

        <footer>VISION / LOCAL SIMULATION · Resource reservations are transactional. Clinical decisions require authorised staff.</footer>
      </main>
    </div>
  );
}
