// The 3D body: where the file is, which parts of it belong to which organ on the Twin page, and the layers that can be switched.
// The model is BodyParts3D (CC BY 4.0), see docs/MODEL_CREDITS.md. Node names come from tools/body-model/build-body-glb.mjs.
export const MODEL_URL = (import.meta.env.BASE_URL || '/') + 'models/body.glb';

// Twin organ key (config/organs.js) -> model nodes that draw it.
export const ORGAN_NODES = {
  heart: ['organ_heart'],
  brain: ['organ_brain'],
  lungs: ['organ_lungs_left', 'organ_lungs_right', 'organ_lungs_left_airways', 'organ_lungs_right_airways'],
  kidneys: ['organ_kidneys_left', 'organ_kidneys_right'],
  liver: ['organ_liver'],
  pancreas: ['organ_pancreas'],
};

// Which layer a node belongs to. Everything not listed with a prefix here is an "organs" part (the other organs drawn for context).
export const layerOf = (name) => (name === 'skin' ? 'skin' : name === 'skeleton' ? 'skeleton' : name.startsWith('vessels_') ? 'vessels' : 'organs');
export const LAYERS = ['skin', 'skeleton', 'organs', 'vessels'];
export const DEFAULT_LAYERS = { skin: true, skeleton: false, organs: true, vessels: false };

// The twin organ a clicked node belongs to, or null (skin, bones and context organs are not selectable).
export const organOfNode = (name) => Object.keys(ORGAN_NODES).find((k) => ORGAN_NODES[k].includes(name)) || null;
