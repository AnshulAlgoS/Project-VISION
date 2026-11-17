import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Row = Record<string, any>;
const HOLO = 0x00c8ff;
const GOLD = 0xf2c14e;
const RED = 0xff3b5c;
const MINT = 0x4dffc3;

/** Live 3D tactical map — hospitals, ambulances, SOS pings and routes straight from /api/state. */
export function TacticalMap3D({ hospitals, ambulances, cases = [] }: { hospitals: Row[]; ambulances: Row[]; cases?: Row[] }) {
  const host = useRef<HTMLDivElement>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const api = useRef<{ update: (h: Row[], a: Row[], c: Row[], active: string) => void } | null>(null);
  const [active, setActive] = useState("");

  useEffect(() => {
    const el = host.current;
    const layer = labelLayer.current;
    if (!el || !layer) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x080d18, 16, 38);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 10.5, 12.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.2;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.45;
    controls.target.set(0, 0.3, 0);
    el.addEventListener("pointerenter", () => (controls.autoRotate = false));
    el.addEventListener("pointerleave", () => (controls.autoRotate = !reduce));

    scene.add(new THREE.AmbientLight(0x5c7ea6, 1.2));
    const sun = new THREE.DirectionalLight(0xbfe9ff, 1.3);
    sun.position.set(-5, 10, 6);
    scene.add(sun);

    /* ground */
    const W = 22;
    const D = 14;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x0b1626, metalness: 0.3, roughness: 0.8 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grid = new THREE.GridHelper(W, 44, HOLO, 0x0f3b52);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.scale.z = D / W;
    grid.position.y = 0.01;
    scene.add(grid);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, 0.02, D)), new THREE.LineBasicMaterial({ color: HOLO, transparent: true, opacity: 0.6 }));
    scene.add(edge);

    /* decorative low-rise district */
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x14253f, metalness: 0.5, roughness: 0.45, emissive: 0x00131f });
    const blocks = new THREE.InstancedMesh(blockGeo, blockMat, 90);
    const o = new THREE.Object3D();
    for (let i = 0; i < 90; i++) {
      const w = 0.4 + rnd() * 0.7;
      const h = 0.2 + rnd() * rnd() * 1.6;
      o.position.set((rnd() - 0.5) * (W - 1.5), h / 2, (rnd() - 0.5) * (D - 1.5));
      o.scale.set(w, h, 0.4 + rnd() * 0.6);
      o.updateMatrix();
      blocks.setMatrixAt(i, o.matrix);
    }
    scene.add(blocks);

    /* dynamic layers */
    const hospGroup = new THREE.Group();
    const ambGroup = new THREE.Group();
    const caseGroup = new THREE.Group();
    const routeGroup = new THREE.Group();
    scene.add(hospGroup, ambGroup, caseGroup, routeGroup);

    const glowTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, "rgba(255,255,255,1)");
      r.addColorStop(0.35, "rgba(255,255,255,.35)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    type H = { group: THREE.Group; tower: THREE.Mesh; ring: THREE.Mesh; mat: THREE.MeshStandardMaterial; ringMat: THREE.MeshBasicMaterial; target: THREE.Vector3; label: HTMLButtonElement; top: THREE.Vector3 };
    type A = { mesh: THREE.Group; core: THREE.Mesh; mat: THREE.MeshBasicMaterial; target: THREE.Vector3; label: HTMLSpanElement; moving: boolean };
    const hospMap = new Map<string, H>();
    const ambMap = new Map<string, A>();
    let caseObjs: THREE.Object3D[] = [];
    let routeObjs: THREE.Line[] = [];
    let activeId = "";
    let proj: (lat: number, lng: number) => THREE.Vector3 = () => new THREE.Vector3();

    const mkLabelBtn = (id: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tm-label";
      b.addEventListener("click", () => setActive((p) => (p === id ? "" : id)));
      layer.appendChild(b);
      return b;
    };

    const build = (hs: Row[], as: Row[], cs: Row[], act: string) => {
      activeId = act;
      // projection fit
      const pts: [number, number][] = [...hs, ...as, ...cs.filter((c) => c.status !== "closed")].map((p) => [Number(p.lat), Number(p.lng)]);
      if (!pts.length) pts.push([28.6139, 77.209]);
      const lats = pts.map((p) => p[0]);
      const lngs = pts.map((p) => p[1]);
      const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const spanKmZ = Math.max((Math.max(...lats) - Math.min(...lats)) * 111, 3) * 1.3;
      const spanKmX = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 98, 3) * 1.3;
      const k = Math.min((W - 5) / spanKmX, (D - 3.5) / spanKmZ);
      proj = (lat, lng) => new THREE.Vector3((lng - cLng) * 98 * k, 0, -(lat - cLat) * 111 * k);

      // hospitals
      const seen = new Set<string>();
      hs.forEach((h) => {
        seen.add(h.id);
        let o = hospMap.get(h.id);
        if (!o) {
          const group = new THREE.Group();
          const mat = new THREE.MeshStandardMaterial({ color: 0x0f4a63, emissive: HOLO, emissiveIntensity: 0.45, metalness: 0.6, roughness: 0.3 });
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1, 6), mat);
          const cap = new THREE.Group();
          const crossMat = new THREE.MeshBasicMaterial({ color: 0xdff8ff });
          cap.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.18), crossMat), new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.62), crossMat));
          tower.add(cap);
          const ringMat = new THREE.MeshBasicMaterial({ color: HOLO, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.02, 64), ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.03;
          const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: HOLO, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
          spr.scale.set(3, 3, 1);
          spr.position.y = 0.7;
          group.add(tower, ring, spr);
          hospGroup.add(group);
          o = { group, tower, ring, mat, ringMat, target: new THREE.Vector3(), label: mkLabelBtn(h.id), top: new THREE.Vector3() };
          hospMap.set(h.id, o);
          group.position.copy(proj(h.lat, h.lng));
        }
        const height = 1.1 + Math.min(Number(h.beds) || 0, 30) / 30 * 2.3;
        o.tower.scale.y = height;
        o.tower.position.y = height / 2;
        (o.tower.children[0] as THREE.Object3D).position.y = 0.5 + 0.04;
        o.target.copy(proj(h.lat, h.lng));
        const sev = Number(h.icu) === 0 ? RED : Number(h.er) / Math.max(1, Number(h.erCapacity)) > 0.8 ? GOLD : HOLO;
        o.mat.emissive.setHex(sev);
        o.mat.color.setHex(sev === RED ? 0x5a1426 : sev === GOLD ? 0x5a4414 : 0x0f4a63);
        o.ringMat.color.setHex(sev);
        o.top.set(0, height + 0.9, 0);
        o.label.dataset.active = h.id === act ? "1" : "0";
        o.label.dataset.sev = sev === RED ? "crit" : sev === GOLD ? "warn" : "ok";
        o.label.innerHTML = `<b>${esc(h.name)}</b><small>${h.icu} ICU · ${h.beds} BEDS · ER ${h.er}/${h.erCapacity}</small>`;
        o.label.setAttribute("aria-label", `Inspect ${h.name}`);
      });
      hospMap.forEach((v, id) => {
        if (!seen.has(id)) { hospGroup.remove(v.group); v.label.remove(); hospMap.delete(id); }
      });

      // ambulances
      const seenA = new Set<string>();
      as.forEach((a) => {
        seenA.add(a.id);
        let o = ambMap.get(a.id);
        if (!o) {
          const mesh = new THREE.Group();
          const mat = new THREE.MeshBasicMaterial({ color: MINT });
          const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat);
          const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: MINT, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
          spr.scale.set(1.3, 1.3, 1);
          mesh.add(core, spr);
          mesh.position.copy(proj(a.lat, a.lng)).setY(0.55);
          ambGroup.add(mesh);
          const label = document.createElement("span");
          label.className = "tm-amb";
          layer.appendChild(label);
          o = { mesh, core, mat, target: new THREE.Vector3(), label, moving: false };
          ambMap.set(a.id, o);
        }
        o.target.copy(proj(a.lat, a.lng)).setY(0.55);
        o.moving = a.status !== "available";
        o.mat.color.setHex(o.moving ? GOLD : MINT);
        o.label.textContent = a.name;
      });
      ambMap.forEach((v, id) => {
        if (!seenA.has(id)) { ambGroup.remove(v.mesh); v.label.remove(); ambMap.delete(id); }
      });

      // SOS pins + routes
      caseObjs.forEach((x) => { caseGroup.remove(x); });
      routeObjs.forEach((x) => { routeGroup.remove(x); x.geometry.dispose(); (x.material as THREE.Material).dispose(); });
      caseObjs = [];
      routeObjs = [];
      cs.filter((c) => c.status !== "closed").forEach((c) => {
        const p = proj(c.lat, c.lng);
        const waiting = c.status === "requested";
        const pin = new THREE.Group();
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: waiting ? RED : 0xffffff }));
        gem.position.y = 0.45;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45), new THREE.MeshBasicMaterial({ color: waiting ? RED : 0x9fdcff }));
        stem.position.y = 0.22;
        const pr = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 40), new THREE.MeshBasicMaterial({ color: waiting ? RED : 0x9fdcff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        pr.rotation.x = -Math.PI / 2;
        pr.position.y = 0.03;
        pr.userData.ping = waiting;
        pin.add(gem, stem, pr);
        pin.position.copy(p);
        caseGroup.add(pin);
        caseObjs.push(pin);
        const h = hs.find((x) => x.id === c.hospitalId);
        if (h && ["dispatched", "transporting", "arrived"].includes(c.status)) {
          const to = proj(h.lat, h.lng);
          const mid = p.clone().lerp(to, 0.5).setY(1.6 + p.distanceTo(to) * 0.12);
          const curve = new THREE.QuadraticBezierCurve3(p.clone().setY(0.45), mid, to.clone().setY(0.6));
          const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
          const ln = new THREE.Line(g, new THREE.LineDashedMaterial({ color: GOLD, dashSize: 0.28, gapSize: 0.18, transparent: true, opacity: 0.95 }));
          ln.computeLineDistances();
          routeGroup.add(ln);
          routeObjs.push(ln);
        }
      });
    };
    api.current = { update: build };

    /* loop */
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.setLength(w / h < 1.1 ? 20 : 15.5);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const v = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      controls.update();
      const bw = el.clientWidth;
      const bh = el.clientHeight;
      const place = (node: HTMLElement, world: THREE.Vector3, dy = 0) => {
        v.copy(world);
        v.project(camera);
        const hidden = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1;
        node.style.opacity = hidden ? "0" : "";
        node.style.pointerEvents = hidden ? "none" : "";
        node.style.transform = `translate(-50%,-100%) translate(${((v.x + 1) / 2) * bw}px,${((1 - v.y) / 2) * bh + dy}px)`;
      };
      hospMap.forEach((h) => {
        h.group.position.lerp(h.target, 0.12);
        const pulse = (t * 0.7) % 1;
        h.ring.scale.setScalar(h.label.dataset.active === "1" ? 1.8 + Math.sin(t * 3) * 0.1 : 1 + pulse * 1.6);
        h.ringMat.opacity = h.label.dataset.active === "1" ? 0.95 : (1 - pulse) * 0.7;
        h.mat.emissiveIntensity = 0.4 + 0.15 * Math.sin(t * 2) + (h.label.dataset.active === "1" ? 0.35 : 0);
        place(h.label, v.copy(h.group.position).add(h.top));
      });
      ambMap.forEach((a) => {
        a.mesh.position.lerp(a.target, 0.08);
        a.core.rotation.y += dt * (a.moving ? 5 : 1.5);
        a.mesh.position.y = 0.55 + Math.sin(t * 2 + a.mesh.position.x) * 0.06;
        place(a.label, a.mesh.position, -16);
      });
      caseObjs.forEach((c) => {
        const ring = c.children[2] as THREE.Mesh;
        if (ring.userData.ping) {
          const p = (t * 0.9) % 1;
          ring.scale.setScalar(1 + p * 4);
          (ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.8;
        }
        c.children[0].rotation.y += dt * 2;
      });
      routeObjs.forEach((l) => { (l.material as THREE.LineDashedMaterial & { dashOffset: number }).dashOffset -= dt * 0.6; });
      renderer.render(scene, camera);
    };
    frame();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      controls.dispose();
      api.current = null;
      layer.replaceChildren();
      scene.traverse((x) => {
        const m = x as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((q) => q.dispose());
      });
      glowTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => { api.current?.update(hospitals, ambulances, cases, active); }, [hospitals, ambulances, cases, active]);

  const focus = hospitals.find((h) => h.id === active);
  return (
    <div className="tm">
      <div className="tm-hud top"><span><i /> SECTOR 07 / DELHI</span><span>LIVE RESOURCE TELEMETRY</span></div>
      <div ref={host} className="tm-canvas" />
      <div ref={labelLayer} className="tm-labels" />
      <div className="tm-hud bottom">
        <span><b className="k-h" /> HOSPITAL <b className="k-a" /> AMBULANCE <b className="k-s" /> SOS <b className="k-r" /> ROUTE</span>
        <span>DRAG TO ROTATE · CLICK A FACILITY</span>
      </div>
      {focus && (
        <div className="tm-detail" role="status">
          <span><b>{focus.name}</b> · ER {focus.er}/{focus.erCapacity} · Oxygen {focus.oxygen} · Blood {focus.blood} · Vent {focus.ventilators}</span>
          <button onClick={() => setActive("")} aria-label="Close facility detail">×</button>
        </div>
      )}
    </div>
  );
}

function esc(s: unknown) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
