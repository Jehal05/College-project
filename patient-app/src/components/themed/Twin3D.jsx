// 3D body (three.js), built from simple shapes in code, so there is no model file and no licence to worry about.
// Drag to turn it, click an organ to select it. The organ list beside it does the same job for keyboard and screen-reader users.
// Loaded on demand (its own file) because the 3D library is large. If 3D cannot start, `onError` tells the page to show the 2D map.
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ORGANS } from '../../config/organs';
import { prefersReducedMotion } from '../../utils/webgl';

const K = 0.012; // map units (the 200 x 420 body map) to 3D units
const X = (cx) => (cx - 100) * K;
const Y = (cy) => (210 - cy) * K;
const rgb = (name) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--ht-' + name).trim().split(/\s+/).map(Number);
  return new THREE.Color(v[0] / 255, v[1] / 255, v[2] / 255);
};
const HOME = { target: new THREE.Vector3(0, 0, 0), distance: 8.6 };

export default function Twin3D({ selected, onSelect, focus, theme, onError }) {
  const { t } = useTranslation();
  const host = useRef(null);
  const live = useRef({}); // things the animation loop reads on every frame
  const handlers = useRef({ onSelect, onError });
  handlers.current = { onSelect, onError };

  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { handlers.current.onError(e); return undefined; }
    const reduced = prefersReducedMotion();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y'; // one finger still scrolls the page; two fingers or a drag on the body turn it

    const accent = rgb('accent'); const accent2 = rgb('accent2');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.3, HOME.distance);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2, 3, 4); scene.add(key);

    // Body: translucent shell with an outline, made of capsules and a sphere.
    const shellMat = new THREE.MeshPhongMaterial({ color: accent, transparent: true, opacity: 0.16, depthWrite: false });
    const lineMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.6 });
    const body = new THREE.Group();
    const part = (geo, x, y, z = 0, rz = 0, sx = 1, sz = 1) => {
      const m = new THREE.Mesh(geo, shellMat); m.position.set(x, y, z); m.rotation.z = rz; m.scale.set(sx, 1, sz); body.add(m);
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), lineMat); l.position.copy(m.position); l.rotation.copy(m.rotation); l.scale.copy(m.scale); body.add(l);
    };
    part(new THREE.SphereGeometry(0.32, 24, 16), 0, Y(34));
    part(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 12), 0, Y(68));
    part(new THREE.CapsuleGeometry(0.5, 1.5, 6, 16), 0, Y(145), 0, 0, 1.05, 0.62);
    part(new THREE.CapsuleGeometry(0.11, 1.25, 4, 10), X(40), Y(140), 0, 0.17);
    part(new THREE.CapsuleGeometry(0.11, 1.25, 4, 10), X(160), Y(140), 0, -0.17);
    part(new THREE.CapsuleGeometry(0.17, 2.0, 4, 12), X(84), Y(305));
    part(new THREE.CapsuleGeometry(0.17, 2.0, 4, 12), X(116), Y(305));
    scene.add(body);

    // Organs from the same list as the 2D map.
    const organMeshes = [];
    const centers = {};
    for (const o of ORGANS) {
      const cx = o.shapes.reduce((a, s) => a + s.cx, 0) / o.shapes.length; const cy = o.shapes.reduce((a, s) => a + s.cy, 0) / o.shapes.length;
      centers[o.key] = new THREE.Vector3(X(cx), Y(cy), 0.12);
      for (const s of o.shapes) {
        const mat = new THREE.MeshPhongMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.15, transparent: true, opacity: 0.55 });
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
        m.scale.set(s.rx * K, s.ry * K, Math.min(s.rx, s.ry) * K * 1.4);
        m.position.set(X(s.cx), Y(s.cy), 0.12);
        m.userData.organ = o.key; m.userData.base = m.scale.clone();
        scene.add(m); organMeshes.push(m);
      }
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 1.8; controls.maxDistance = 11;
    controls.minPolarAngle = Math.PI * 0.3; controls.maxPolarAngle = Math.PI * 0.7;
    controls.target.copy(HOME.target);

    // Clicking (not dragging) an organ selects it.
    const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = null;
    const dom = renderer.domElement;
    const aim = (e) => { const r = dom.getBoundingClientRect(); pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(pointer, camera); return ray.intersectObjects(organMeshes)[0]; };
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const hit = aim(e); if (hit) handlers.current.onSelect(hit.object.userData.organ);
    };
    const onMove = (e) => { dom.style.cursor = aim(e) ? 'pointer' : 'grab'; };
    dom.addEventListener('pointerdown', onDown); dom.addEventListener('pointerup', onUp); dom.addEventListener('pointermove', onMove);

    const size = () => {
      const w = el.clientWidth || 300; const h = el.clientHeight || 400;
      renderer.setSize(w, h, false); dom.style.width = '100%'; dom.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();

    live.current = { organMeshes, centers, goal: { ...HOME, target: HOME.target.clone() }, selected, instant: reduced };
    const clock = new THREE.Clock(); let raf = 0; let drawn = false;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const L = live.current; const dt = Math.min(clock.getDelta(), 0.05); const time = clock.elapsedTime;
      // Move the camera toward the goal (at once when motion is reduced).
      const k = L.instant ? 1 : 1 - Math.exp(-dt * 5);
      const dir = camera.position.clone().sub(controls.target).normalize();
      controls.target.lerp(L.goal.target, k);
      const dist = camera.position.distanceTo(controls.target);
      camera.position.copy(controls.target).addScaledVector(dir, dist + (L.goal.distance - dist) * k);
      for (const m of organMeshes) {
        const on = m.userData.organ === L.selected;
        m.material.emissiveIntensity = on ? 0.9 : 0.12; m.material.opacity = on ? 0.9 : 0.4;
        m.material.color.copy(on ? accent2 : accent); m.material.emissive.copy(on ? accent2 : accent);
        const beat = !reduced && m.userData.organ === 'heart' ? 1 + 0.06 * Math.sin(time * 6) : 1; // a gentle heartbeat, off when motion is reduced
        m.scale.copy(m.userData.base).multiplyScalar(on ? 1.15 * beat : beat);
      }
      controls.update(); renderer.render(scene, camera);
      if (!drawn) { drawn = true; el.dataset.ready = 'true'; }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('pointerup', onUp); dom.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose(); renderer.forceContextLoss(); // frees the graphics context at once (browsers allow only a few)
      if (dom.parentNode === el) el.removeChild(dom); delete el.dataset.ready;
    };
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps -- the scene is built once per theme; later changes go through `live`

  // Selection and focus change what the loop aims at, without rebuilding the scene.
  useEffect(() => {
    const L = live.current; if (!L.centers) return;
    L.selected = selected;
    const c = L.centers[selected];
    L.goal = focus && c ? { target: c.clone(), distance: 2.6 } : { target: HOME.target.clone(), distance: HOME.distance };
  }, [selected, focus, theme]);

  return (
    <div className="w-full">
      <div ref={host} role="img" aria-label={t('dtwin.map3d.label', { organ: t('dtwin.organ.' + selected + '.name') })} className="mx-auto h-[540px] w-full max-w-[420px] cursor-grab" />
      <p className="mt-2 text-center text-xs text-ht-muted">{t('dtwin.map3d.hint')}</p>
    </div>
  );
}
