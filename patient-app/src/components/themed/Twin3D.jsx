// 3D body (three.js) from the BodyParts3D anatomy model (CC BY 4.0, docs/MODEL_CREDITS.md): skin, skeleton, organs and vessels as layers.
// Drag to turn it, click one of the six organs to select it. The organ list beside it does the same job for keyboard and screen-reader users.
// Loaded on demand (its own file) because the 3D library and the model are large. If 3D or the model cannot load, `onError` tells the page to show the 2D map.
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MODEL_URL, ORGAN_NODES, layerOf, organOfNode } from '../../config/bodyModel';
import { prefersReducedMotion } from '../../utils/webgl';

const rgb = (name) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--ht-' + name).trim().split(/\s+/).map(Number);
  return new THREE.Color(v[0] / 255, v[1] / 255, v[2] / 255);
};
const HOME = { target: new THREE.Vector3(0, 0.88, 0), distance: 3.05 };
const LOAD_LIMIT_MS = 25000; // the model is about 2.4 MB; on a very slow connection the page shows the 2D map instead

export default function Twin3D({ selected, onSelect, focus, theme, layers, statuses, side, onError }) {
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
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y'; // one finger still scrolls the page; two fingers or a drag on the body turn it

    const accent = rgb('accent'); const accent2 = rgb('accent2');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
    camera.position.set(0, 1.0, HOME.distance);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(2, 3, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd6ff, 0.5); fill.position.set(-3, 1, -2); scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 0.5; controls.maxDistance = 6;
    controls.minPolarAngle = Math.PI * 0.2; controls.maxPolarAngle = Math.PI * 0.8;
    controls.target.copy(HOME.target);
    controls.autoRotate = !reduced; controls.autoRotateSpeed = 0.7; // slow idle turn, off when motion is reduced

    const dom = renderer.domElement;
    const meshes = []; // every mesh of the model: { mesh, name, layer, organ, base }
    const centers = {}; // organ key -> { target, size }
    let disposed = false; let timer;
    live.current = { meshes, centers, goal: { ...HOME, target: HOME.target.clone() }, selected, focus, layers, statuses, side, instant: reduced, sideApplied: null };

    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    timer = setTimeout(() => { if (!disposed && !meshes.length) handlers.current.onError(new Error('model timeout')); }, LOAD_LIMIT_MS);
    loader.load(MODEL_URL, (gltf) => {
      clearTimeout(timer); if (disposed) return;
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const name = o.name; const layer = layerOf(name);
        const base = o.material.color.clone();
        o.material = new THREE.MeshStandardMaterial({ color: base, roughness: 0.65, metalness: 0, transparent: true, opacity: 1, side: THREE.DoubleSide });
        o.renderOrder = layer === 'skin' ? 5 : 1;
        meshes.push({ mesh: o, name, layer, organ: organOfNode(name), base, shell: name === 'organ_lungs_left' || name === 'organ_lungs_right' }); // the lung outline is see-through so the heart shows inside
      });
      scene.add(gltf.scene);
      for (const k of Object.keys(ORGAN_NODES)) {
        const box = new THREE.Box3();
        for (const m of meshes) if (m.organ === k) box.expandByObject(m.mesh);
        centers[k] = { target: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() };
      }
      applyFocus();
    }, undefined, (err) => { clearTimeout(timer); if (!disposed) handlers.current.onError(err); });

    // Clicking (not dragging) a selectable organ selects it.
    const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = null;
    const aim = (e) => {
      const r = dom.getBoundingClientRect(); pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(pointer, camera);
      const targets = meshes.filter((m) => m.organ && m.mesh.visible).map((m) => m.mesh);
      const hit = ray.intersectObjects(targets, false)[0];
      return hit ? meshes.find((m) => m.mesh === hit.object).organ : null;
    };
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const organ = aim(e); if (organ) handlers.current.onSelect(organ);
    };
    const onMove = (e) => { dom.style.cursor = aim(e) ? 'pointer' : 'grab'; };
    dom.addEventListener('pointerdown', onDown); dom.addEventListener('pointerup', onUp); dom.addEventListener('pointermove', onMove);

    const size = () => {
      const w = el.clientWidth || 300; const h = el.clientHeight || 400;
      renderer.setSize(w, h, false); dom.style.width = '100%'; dom.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();

    function applyFocus() {
      const L = live.current; const c = L.centers[L.selected];
      L.goal = L.focus && c ? { target: c.target.clone(), distance: Math.max(0.7, c.size * 2.6) } : { target: HOME.target.clone(), distance: HOME.distance };
      controls.autoRotate = !reduced && !(L.focus && c);
    }
    live.current.applyFocus = applyFocus;

    const STATUS_TINT = { within: accent2, different: new THREE.Color(0.96, 0.62, 0.1) };
    const clock = new THREE.Clock(); let raf = 0; let drawn = false; let frames = 0; let slow = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const L = live.current; const dt = Math.min(clock.getDelta(), 0.1); const time = clock.elapsedTime;
      // Move the camera toward the goal (at once when motion is reduced).
      const k = L.instant ? 1 : 1 - Math.exp(-dt * 5);
      const dir = camera.position.clone().sub(controls.target).normalize();
      // Front / back buttons: turn the camera round the body.
      if (L.side && L.side !== L.sideApplied) {
        const flat = Math.hypot(dir.x, dir.z) || 1; dir.x = 0; dir.z = (L.side === 'back' ? -1 : 1) * flat; L.sideApplied = L.side;
        camera.position.copy(controls.target).addScaledVector(dir, camera.position.distanceTo(controls.target));
      }
      controls.target.lerp(L.goal.target, k);
      const dist = camera.position.distanceTo(controls.target);
      camera.position.copy(controls.target).addScaledVector(dir, dist + (L.goal.distance - dist) * k);
      for (const m of meshes) {
        const visible = m.layer === 'skin' ? L.layers.skin : m.layer === 'skeleton' ? L.layers.skeleton : m.layer === 'vessels' ? L.layers.vessels : L.layers.organs;
        m.mesh.visible = visible;
        if (!visible) continue;
        const mat = m.mesh.material;
        if (m.layer === 'skin') { mat.opacity = L.focus ? 0.05 : L.layers.organs || L.layers.skeleton || L.layers.vessels ? 0.13 : 0.55; mat.depthWrite = false; mat.color.copy(m.base); continue; }
        const on = m.organ && m.organ === L.selected;
        const tint = m.organ ? STATUS_TINT[L.statuses[m.organ]] : null;
        mat.color.copy(m.base); if (tint) mat.color.lerp(tint, 0.35);
        mat.emissive.copy(on ? accent : new THREE.Color(0, 0, 0)); mat.emissiveIntensity = on ? 0.28 + (reduced ? 0 : 0.1 * Math.sin(time * 4)) : 0;
        const dim = L.selected && !on && (m.layer === 'organs' || m.layer === 'vessels') ? 0.5 : 1; // the chosen organ stands out
        mat.opacity = m.organ || m.layer !== 'organs' ? (L.focus ? dim : 1) : (L.focus ? 0.35 : 0.75);
        if (m.shell) mat.opacity = Math.min(mat.opacity, on ? 0.6 : 0.42);
        mat.depthWrite = mat.opacity > 0.95;
      }
      controls.update(); renderer.render(scene, camera);
      if (meshes.length && !drawn) { drawn = true; el.dataset.ready = 'true'; }
      // Slow phone or software graphics: lower the sharpness and stop the idle turn instead of stuttering.
      if (drawn && frames < 90) { frames += 1; if (dt > 0.05) slow += 1; if (frames === 90 && slow > 45) { pixelRatio = 1; renderer.setPixelRatio(1); size(); controls.autoRotate = false; el.dataset.quality = 'low'; } }
    };
    frame();

    return () => {
      disposed = true; clearTimeout(timer);
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('pointerup', onUp); dom.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose(); renderer.forceContextLoss(); // frees the graphics context at once (browsers allow only a few)
      if (dom.parentNode === el) el.removeChild(dom); delete el.dataset.ready; delete el.dataset.quality;
    };
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps -- the scene is built once per theme; later changes go through `live`

  // Selection, focus, layers and status change what the loop draws, without rebuilding the scene.
  useEffect(() => {
    const L = live.current; if (!L.centers) return;
    L.selected = selected; L.focus = focus; L.layers = layers; L.statuses = statuses; L.side = side;
    if (L.applyFocus) L.applyFocus();
  }, [selected, focus, layers, statuses, side, theme]);

  return (
    <div className="w-full">
      <div ref={host} role="img" aria-label={t('dtwin.map3d.label', { organ: t('dtwin.organ.' + selected + '.name') })} className="mx-auto h-[560px] w-full max-w-[440px] cursor-grab" />
      <p className="mt-2 text-center text-xs text-ht-muted">{t('dtwin.map3d.hint')}</p>
    </div>
  );
}
