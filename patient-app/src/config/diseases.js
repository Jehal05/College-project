// The six "intelligence" areas. Each one is a view onto an organ from config/organs.js, so the readings and keywords stay in one place.
export const MODULES = [
  { key: 'cardiac', organ: 'heart', icon: 'heart' },
  { key: 'neuro', organ: 'brain', icon: 'activity' },
  { key: 'respiratory', organ: 'lungs', icon: 'wind' },
  { key: 'diabetes', organ: 'pancreas', icon: 'bolt' },
  { key: 'kidney', organ: 'kidneys', icon: 'shield' },
  { key: 'liver', organ: 'liver', icon: 'file' },
];
export const moduleByKey = (k) => MODULES.find((m) => m.key === k) || null;
export const STEP_COUNT = 3; // every area has three general suggestions, in all three languages
