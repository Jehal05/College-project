// Builds the small body model used by the digital twin from the BodyParts3D 4.0 data (CC BY 4.0, see docs/MODEL_CREDITS.md).
// Input: a folder that holds atlas.json and body-N.bin (the browser-ready packaging of BodyParts3D in github.com/ashemag/human-atlas, public/models).
// Output: patient-app/public/models/body.glb with one named node per organ (organ_heart, organ_lungs_left, ...), context organs (ctx_*),
// a skin layer, a skeleton layer and two vessel layers. Geometry is simplified further and compressed with meshopt.
//   npm install && node build-body-glb.mjs /path/to/public/models ../../patient-app/public/models/body.glb
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { createRequire } from 'node:module';
const convexHull = createRequire(import.meta.url)('convex-hull');

const [, , srcDir = '.', outFile = 'body.glb'] = process.argv;
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const atlas = JSON.parse(fs.readFileSync(path.join(srcDir, 'atlas.json'), 'utf8'));
const chunks = atlas.chunks.map((c) => fs.readFileSync(path.join(srcDir, path.basename(c.url))));
const byId = new Map(atlas.parts.map((p) => [p.id, p]));
const concept = (name) => atlas.concepts.find((c) => c.name.toLowerCase() === name);
const conceptParts = (name) => concept(name).elements.map((e) => byId.get(e)).filter(Boolean);
const diag = (p) => Math.hypot(...p.bounds[1].map((v, i) => v - p.bounds[0][i]));

// Simplifies every part on its own (to `ratio` of its triangles, at least `min`) and then merges them. Used for the skeleton: simplifying
// 296 separate bones as one mesh made sharp shards between them.
function mergeReduced(parts, ratio, min = 80) {
  const outP = []; const outI = []; let base = 0;
  for (const part of parts) {
    const { positions, indices } = merge([part]);
    const target = Math.max(min, Math.round((indices.length / 3) * ratio));
    let ind = indices;
    if (indices.length / 3 > target) { MeshoptSimplifier.useExperimentalFeatures = true; [ind] = MeshoptSimplifier.simplify(indices, positions, 3, target * 3, 0.02, ['ErrorAbsolute'].slice(0, 0)); }
    for (const v of positions) outP.push(v);
    for (const i of ind) outI.push(i + base);
    base += positions.length / 3;
  }
  return { positions: Float32Array.from(outP), indices: Uint32Array.from(outI) };
}

// Reads the parts' geometry (float32 positions, uint32 indices) and merges it into one mesh.
function merge(parts) {
  const pos = []; const idx = []; let base = 0;
  for (const p of parts) {
    const b = chunks[p.chunk];
    const P = new Float32Array(b.buffer.slice(b.byteOffset + p.positions, b.byteOffset + p.positions + p.vertexCount * 12));
    const I = new Uint32Array(b.buffer.slice(b.byteOffset + p.indices, b.byteOffset + p.indices + p.indexCount * 4));
    for (const v of P) pos.push(v);
    for (const i of I) idx.push(i + base);
    base += p.vertexCount;
  }
  return { positions: Float32Array.from(pos), indices: Uint32Array.from(idx) };
}

// Reduces to about `target` triangles, drops unused vertices and computes smooth normals.
function reduce({ positions, indices }, target) {
  let ind = indices;
  if (ind.length / 3 > target) {
    MeshoptSimplifier.useExperimentalFeatures = true;
    [ind] = MeshoptSimplifier.simplify(indices, positions, 3, target * 3, 0.05, ['Sparse']);
  }
  const map = new Map(); const P = []; const I = new Uint32Array(ind.length);
  ind.forEach((v, k) => { if (!map.has(v)) { map.set(v, P.length / 3); P.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]); } I[k] = map.get(v); });
  const pos = Float32Array.from(P); const nor = new Float32Array(pos.length);
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
    const u = [0, 1, 2].map((k) => pos[b * 3 + k] - pos[a * 3 + k]); const w = [0, 1, 2].map((k) => pos[c * 3 + k] - pos[a * 3 + k]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) nor[v * 3 + k] += n[k];
  }
  for (let v = 0; v < nor.length; v += 3) { const l = Math.hypot(nor[v], nor[v + 1], nor[v + 2]) || 1; nor[v] /= l; nor[v + 1] /= l; nor[v + 2] /= l; }
  return { positions: pos, normals: nor, indices: I };
}

// BodyParts3D has no solid lung surface, only the airway and vessel trees inside each lung. The lung outline is the convex hull of that tree,
// pulled in slightly towards its centre so it reads as a lung and not as a box. It is a generic outline, not a measured lung (see docs/MODEL_CREDITS.md).
function lungOutline(parts, shrink = 0.97) {
  const { positions } = merge(parts); const pts = [];
  for (let i = 0; i < positions.length; i += 3) pts.push([positions[i], positions[i + 1], positions[i + 2]]);
  const c = pts.reduce((a, p) => a.map((v, k) => v + p[k] / pts.length), [0, 0, 0]);
  const moved = pts.map((p) => p.map((v, k) => c[k] + (v - c[k]) * shrink));
  const faces = convexHull(moved); // triangles as index triples into `moved`, orientation not guaranteed
  const flat = faces.map(([a, b, c]) => { // make every triangle face away from the centre
    const u = [0, 1, 2].map((k) => moved[b][k] - moved[a][k]); const w = [0, 1, 2].map((k) => moved[c][k] - moved[a][k]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const out = [0, 1, 2].reduce((d, k) => d + n[k] * (moved[a][k] - c[k]), 0);
    return out >= 0 ? [a, b, c] : [a, c, b];
  });
  return { positions: Float32Array.from(moved.flat()), indices: Uint32Array.from(flat.flat()) };
}

const named = (...ids) => ids.map((i) => byId.get(i));
const largeVessels = (system) => atlas.parts.filter((p) => p.system === system && diag(p) > 0.16);
// name, colour, opacity, parts, triangle budget
const NODES = [
  ['skin', [0.85, 0.72, 0.62], 1, named('FJ2810'), 12000],
  ['skeleton', [0.9, 0.87, 0.78], 1, atlas.parts.filter((p) => p.system === 'skeletal'), 1e9, (parts) => mergeReduced(parts, 0.17)],
  ['organ_brain', [0.86, 0.66, 0.66], 1, conceptParts('brain'), 18000],
  ['organ_heart', [0.72, 0.2, 0.22], 1, conceptParts('heart'), 14000],
  ['organ_lungs_right', [0.9, 0.62, 0.64], 1, conceptParts('right lung'), 9000, lungOutline],
  ['organ_lungs_left', [0.9, 0.62, 0.64], 1, conceptParts('left lung'), 7000, lungOutline],
  ['organ_lungs_right_airways', [0.78, 0.35, 0.4], 1, conceptParts('right lung'), 4000],
  ['organ_lungs_left_airways', [0.78, 0.35, 0.4], 1, conceptParts('left lung'), 3000],
  ['organ_liver', [0.5, 0.2, 0.15], 1, conceptParts('liver'), 10000],
  ['organ_kidneys_left', [0.6, 0.22, 0.2], 1, named('FJ3145'), 1500],
  ['organ_kidneys_right', [0.6, 0.22, 0.2], 1, named('FJ3147'), 1500],
  ['organ_pancreas', [0.85, 0.7, 0.45], 1, conceptParts('pancreas'), 3500],
  ['ctx_stomach', [0.82, 0.55, 0.5], 1, named('FJ2564'), 1700],
  ['ctx_small_intestine', [0.85, 0.62, 0.55], 1, conceptParts('small intestine'), 7000],
  ['ctx_large_intestine', [0.8, 0.55, 0.45], 1, conceptParts('large intestine'), 8000],
  ['ctx_spleen', [0.45, 0.17, 0.25], 1, named('FJ2561'), 1200],
  ['ctx_gallbladder', [0.4, 0.55, 0.25], 1, named('FJ2817'), 900],
  ['ctx_bladder', [0.82, 0.6, 0.55], 1, named('FJ3149'), 224],
  ['ctx_trachea', [0.8, 0.8, 0.85], 1, named('FJ2541', 'FJ2450', 'FJ2539'), 4000],
  ['vessels_arterial', [0.78, 0.15, 0.15], 1, largeVessels('arterial'), 12000],
  ['vessels_venous', [0.25, 0.4, 0.75], 1, largeVessels('venous'), 12000],
];

const doc = new Document(); const buffer = doc.createBuffer(); const scene = doc.createScene('body');
doc.createExtension(KHRMeshQuantization).setRequired(true);
let total = 0;
for (const [name, rgb, , parts, budget, shape] of NODES) {
  const ok = parts.filter(Boolean); if (!ok.length) throw new Error('no parts for ' + name);
  const g = reduce(shape ? shape(ok) : merge(ok), budget); total += g.indices.length / 3;
  const mat = doc.createMaterial(name).setBaseColorFactor([...rgb, 1]).setRoughnessFactor(0.7).setMetallicFactor(0);
  const prim = doc.createPrimitive().setMaterial(mat)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.positions).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.normals).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(g.indices).setBuffer(buffer));
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)).setExtras({ source: ok.map((p) => p.id), triangles: g.indices.length / 3 }));
  console.log(name.padEnd(22), String(g.indices.length / 3).padStart(6), 'triangles from', ok.length, 'parts');
}
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(outFile, doc);
console.log('total triangles', total, '->', outFile, (fs.statSync(outFile).size / 1e6).toFixed(2), 'MB');
