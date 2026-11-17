import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Turns a flat portrait into a depth-relief 3D bust: brightness drives vertex displacement,
 * the mesh follows the pointer, and holo particles + rings float around it.
 * Swap `src` for any portrait (ideally on a dark background).
 */
export function ShuriRelief3D({ src = "/images/shuri-vision.jpg", className = "", label = "Shuri — Wakanda Design Group" }: { src?: string; className?: string; label?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
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
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 9);

    const tex = new THREE.TextureLoader().load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uDepth: { value: 0.55 } },
      vertexShader: `
        uniform sampler2D uMap; uniform float uDepth; varying vec2 vUv; varying float vL;
        void main(){
          vUv = uv;
          vec3 c = texture2D(uMap, uv).rgb;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          // soft vignette so edges stay flat and the face/shoulders pop forward
          float edge = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x) * smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
          vL = l;
          vec3 p = position; p.z += (l * uDepth) * edge;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uTime; varying vec2 vUv; varying float vL;
        void main(){
          vec3 c = texture2D(uMap, vUv).rgb;
          float scan = 0.94 + 0.06 * sin(vUv.y * 900.0 - uTime * 4.0);
          float sweep = smoothstep(0.0, 0.012, abs(fract(uTime * 0.18) - vUv.y));
          vec3 holo = vec3(0.0, 0.78, 1.0) * (1.0 - sweep) * 0.35;
          float l0 = dot(c, vec3(0.299, 0.587, 0.114));
          float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          float a = edge * (0.25 + 0.75 * smoothstep(0.02, 0.2, l0));
          float rim = smoothstep(0.35, 0.9, vL) * 0.12;
          gl_FragColor = vec4(c * scan + holo * a + vec3(0.0, 0.5, 0.7) * rim, a);
        }`,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.5, 160, 200), mat);
    const rig = new THREE.Group();
    rig.add(plane);
    scene.add(rig);

    // holo rings + particles behind the bust
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.012, 8, 160), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.01, 8, 160), new THREE.MeshBasicMaterial({ color: 0x9b5cff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring1.position.z = ring2.position.z = -0.6;
    scene.add(ring1, ring2);
    const N = 240;
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pp.set([(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 8, -1 + Math.random() * 2.5], i * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9ff0ff, size: 0.045, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts);

    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      ptr.x = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width - 0.5) * 2));
      ptr.y = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height - 0.5) * 2));
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = Math.max(9.5, 6.4 / Math.min(camera.aspect, 1.1));
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0, visible = true, t = 0, last = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += reduce ? dt * 0.2 : dt;
      ptr.sx += (ptr.x - ptr.sx) * 0.06;
      ptr.sy += (ptr.y - ptr.sy) * 0.06;
      const auto = reduce ? 0 : Math.sin(t * 0.6) * 0.18;
      rig.rotation.y = ptr.sx * 0.45 + auto;
      rig.rotation.x = ptr.sy * 0.22;
      rig.position.y = Math.sin(t * 1.1) * 0.06;
      ring1.rotation.set(1.2 + t * 0.2, t * 0.3, 0);
      ring2.rotation.set(-0.6, t * -0.25, t * 0.15);
      pts.rotation.y = t * 0.05;
      mat.uniforms.uTime.value = t;
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
        const mm = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mm) ? mm : mm ? [mm] : []).forEach((x) => x.dispose());
      });
      tex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return <div ref={host} className={className} role="img" aria-label={label} />;
}
