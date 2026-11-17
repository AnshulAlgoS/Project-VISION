import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Wakanda vibranium skyline: a living hex-prism city around a spinning vibranium core.
 * Pure presentation — no data dependencies. Pauses off-screen / hidden tab, honours reduced motion.
 */
const HOLO = 0x00c8ff;
const GOLD = 0xf2c14e;

export function HeroScene3D({ className = "", intensity = 1, shift = 0 }: { className?: string; intensity?: number; shift?: number }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL — CSS backdrop remains
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080d18, 0.034);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

    scene.add(new THREE.AmbientLight(0x4a6a8f, 0.9));
    const rim = new THREE.DirectionalLight(0x9fdcff, 1.1);
    rim.position.set(-6, 9, 5);
    scene.add(rim);
    const coreLight = new THREE.PointLight(HOLO, 60 * intensity, 34, 1.6);
    coreLight.position.set(0, 4.2, 0);
    scene.add(coreLight);

    /* ---------- hex city ---------- */
    const N = 11;
    const SIZE = 0.62;
    const tiles: { x: number; z: number; d: number; h: number; ph: number; vib: boolean }[] = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let q = -N; q <= N; q++) {
      for (let r = -N; r <= N; r++) {
        if (Math.abs(q + r) > N) continue;
        const x = SIZE * Math.sqrt(3) * (q + r / 2);
        const z = SIZE * 1.5 * r;
        const d = Math.hypot(x, z);
        if (d < 2.3) continue; // clear the core plaza
        const fall = Math.max(0, 1 - d / (N * SIZE * 1.6));
        const h = 0.18 + Math.pow(fall, 1.7) * 3.4 * (0.45 + rand() * 0.75);
        tiles.push({ x, z, d, h, ph: rand() * Math.PI * 2, vib: rand() > 0.9 });
      }
    }
    const hexGeo = new THREE.CylinderGeometry(SIZE * 0.93, SIZE * 0.93, 1, 6);
    hexGeo.translate(0, 0.5, 0);
    const hexMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.65, roughness: 0.32, emissive: 0x001c2c, emissiveIntensity: 1 });
    const city = new THREE.InstancedMesh(hexGeo, hexMat, tiles.length);
    const tmp = new THREE.Object3D();
    const col = new THREE.Color();
    tiles.forEach((t, i) => {
      col.set(t.vib ? 0x0e5f7a : 0x13233d).offsetHSL(0, 0, rand() * 0.04);
      city.setColorAt(i, col);
    });
    scene.add(city);

    // glowing top & base outlines (one LineSegments, updated each frame)
    const segs = tiles.length * 6;
    const linePos = new Float32Array(segs * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: HOLO, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.frustumCulled = false;
    scene.add(lines);
    const corner = Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k;
      return [Math.sin(a) * SIZE * 0.93, Math.cos(a) * SIZE * 0.93] as const;
    });

    /* ---------- ground glow rings ---------- */
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.98, 1, 96),
        new THREE.MeshBasicMaterial({ color: HOLO, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.04;
      scene.add(m);
      rings.push(m);
    }
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(N * SIZE * 1.9, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a1626, transparent: true, opacity: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    /* ---------- vibranium core ---------- */
    const core = new THREE.Group();
    core.position.set(0, 3.3, 0);
    scene.add(core);
    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 32), new THREE.MeshBasicMaterial({ color: 0xaaf1ff }));
    const shellA = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 1),
      new THREE.MeshBasicMaterial({ color: HOLO, wireframe: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }),
    );
    const shellB = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.7, 1),
      new THREE.MeshBasicMaterial({ color: 0x4fd9ff, wireframe: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending }),
    );
    core.add(nucleus, shellA, shellB);
    const gyros = [
      { r: 2.35, c: HOLO, ax: [1, 0.3, 0], sp: 0.7 },
      { r: 2.85, c: GOLD, ax: [0.2, 1, 0.4], sp: -0.5 },
      { r: 3.35, c: 0x7fe3ff, ax: [0.6, 0.2, 1], sp: 0.35 },
    ].map((g) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(g.r, 0.022, 8, 160),
        new THREE.MeshBasicMaterial({ color: g.c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
      );
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshBasicMaterial({ color: g.c }));
      node.position.set(g.r, 0, 0);
      m.add(node);
      core.add(m);
      return { m, ...g };
    });

    /* ---------- light beam ---------- */
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 2.2, 18, 40, 1, true),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "varying vec2 vUv; uniform float uTime; void main(){ float a = pow(1.0 - vUv.y, 2.2) * 0.22; a *= 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 3.0); gl_FragColor = vec4(0.0, 0.78, 1.0, a); }",
      }),
    );
    beam.position.y = 9;
    scene.add(beam);

    /* ---------- particles ---------- */
    const P = 900;
    const pPos = new Float32Array(P * 3);
    const pSpeed = new Float32Array(P);
    for (let i = 0; i < P; i++) {
      const a = rand() * Math.PI * 2;
      const rad = 1.5 + rand() * 11;
      pPos.set([Math.cos(a) * rad, rand() * 11, Math.sin(a) * rad], i * 3);
      pSpeed[i] = 0.15 + rand() * 0.5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x7fe3ff, size: 0.07, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    /* ---------- loop ---------- */
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      pointer.x = ((e.clientX - b.left) / b.width - 0.5) * 2;
      pointer.y = ((e.clientY - b.top) / b.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 62 : 42;
      // slide the whole city toward the right so copy on the left stays clear
      if (shift && w / h >= 1) camera.setViewOffset(w, h, -shift * w, 0, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let last = performance.now();
    let elapsed = 0;
    let raf = 0;
    let visible = true;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - last) / 1000, 0.05);
      last = nowMs;
      elapsed += dt;
      const t = elapsed * (reduce ? 0.15 : 1);

      pointer.sx += (pointer.x - pointer.sx) * 0.05;
      pointer.sy += (pointer.y - pointer.sy) * 0.05;
      const ang = t * 0.07 + pointer.sx * 0.55 + 0.5;
      const rad = 19;
      camera.position.set(Math.sin(ang) * rad, 7.2 - pointer.sy * 1.6, Math.cos(ang) * rad);
      camera.lookAt(0, 2.1, 0);

      // city ripple
      let li = 0;
      for (let i = 0; i < tiles.length; i++) {
        const tl = tiles[i];
        const wave = Math.sin(t * 1.3 - tl.d * 0.75 + tl.ph * 0.15);
        const h = tl.h * (1 + 0.07 * wave) + (tl.vib ? 0.12 + 0.1 * Math.sin(t * 2 + tl.ph) : 0);
        tmp.position.set(tl.x, 0, tl.z);
        tmp.scale.set(1, h, 1);
        tmp.updateMatrix();
        city.setMatrixAt(i, tmp.matrix);
        for (let k = 0; k < 6; k++) {
          const a = corner[k];
          const b = corner[(k + 1) % 6];
          linePos[li++] = tl.x + a[0]; linePos[li++] = h + 0.005; linePos[li++] = tl.z + a[1];
          linePos[li++] = tl.x + b[0]; linePos[li++] = h + 0.005; linePos[li++] = tl.z + b[1];
        }
      }
      city.instanceMatrix.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;

      core.position.y = 3.3 + Math.sin(t * 1.1) * 0.18;
      shellA.rotation.set(t * 0.4, t * 0.6, 0);
      shellB.rotation.set(-t * 0.25, t * 0.3, t * 0.1);
      nucleus.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
      coreLight.intensity = (55 + Math.sin(t * 3) * 10) * intensity;
      gyros.forEach((g) => {
        g.m.rotation.x = t * g.sp * g.ax[0] + 1.1;
        g.m.rotation.y = t * g.sp * g.ax[1];
        g.m.rotation.z = t * g.sp * g.ax[2] * 0.6;
      });
      (beam.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      rings.forEach((r, i) => {
        const p = (t * 0.22 + i / 3) % 1;
        r.scale.setScalar(1.5 + p * 13);
        (r.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.55;
      });
      for (let i = 0; i < P; i++) {
        let y = pPos[i * 3 + 1] + pSpeed[i] * dt * (reduce ? 0.2 : 1);
        if (y > 11) y = 0;
        pPos[i * 3 + 1] = y;
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    frame();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [intensity, shift]);

  return <div ref={host} className={className} aria-hidden="true" />;
}
