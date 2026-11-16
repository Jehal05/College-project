# Body model credits and licence

The 3D body in the digital twin (`patient-app/public/models/body.glb`) is built from **BodyParts3D**, an adult male reference anatomy.

**Attribution (required):** BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution 4.0 International.

| Item | Detail |
|---|---|
| Data | BodyParts3D 4.0, Mitsuhashi et al. (2009), *BodyParts3D: 3D structure database for anatomical concepts*, https://doi.org/10.1093/nar/gkn613 |
| Licence | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Current database licence: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (updated 2025-02-27). It permits redistribution and adaptation with attribution. There is **no share-alike condition**. |
| Source of the files we used | The browser-ready packaging in https://github.com/ashemag/human-atlas (`public/models`: `atlas.json`, `body-*.bin`). That project's code is MIT; its anatomy data is CC BY 4.0 and its own adaptation note (meshoptimizer simplification, Y-up metres) is in its `public/ATTRIBUTION.md`. |
| Reached through | GitHub (git clone). The BodyParts3D archive site itself was not reachable from the build environment, so the original OBJ archive was **not** read directly. The licence text above was read in the human-atlas `ATTRIBUTION.md`, which links to the database licence page; re-check that page before any public release. |
| Not used | Any marketplace model, any AI-generated model, any Z-Anatomy component (some Z-Anatomy parts are non-commercial). |

## What we changed (adaptations)

`tools/body-model/build-body-glb.mjs` reads the packaged data and writes one small file:

- Kept only: skin, skeleton, brain, heart, lungs (see below), liver, kidneys, pancreas, stomach, small and large intestine, spleen, gallbladder, bladder, trachea and bronchi, and the larger arteries and veins.
- Merged the pieces of each organ into one named node (`organ_heart`, `organ_liver`, `ctx_stomach`, ...).
- Simplified the geometry further (meshoptimizer) to about 190,000 triangles in total, recomputed smooth normals, and compressed with meshopt (EXT_meshopt_compression, KHR_mesh_quantization). File size about 2.4 MB.
- **Lungs:** this data has no solid lung surface, only the airway and vessel trees inside each lung. The lung shape in the app is the convex hull of that tree, pulled in 3 percent. It is a generic outline and not a measured lung. The airway tree is drawn inside it.
- Colours are our own choice.

The modified model file is released under the same CC BY 4.0 licence as the source. Keep this credit with it.

## Honest limits

- It is a generic adult male reference, not this person's body, and not a scan.
- It is an illustration. It does not show disease and must not be used for diagnosis.
- Not every structure is included (for example no muscles, nerves or reproductive organs).

## Rebuild

```sh
cd tools/body-model && npm install
node build-body-glb.mjs <folder with atlas.json and body-*.bin> ../../patient-app/public/models/body.glb
```
