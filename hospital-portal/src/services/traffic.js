// Simulated traffic and green corridor (feature #45). Pure functions.
// The numbers come from data/traffic-config.json. None of this is real traffic data.

/** light | moderate | heavy for an hour of the day (0 to 23). */
export function levelForHour(config, hour) {
  const slot = (config.hours || []).find((h) => hour >= h.from && hour < h.to);
  return slot?.level || 'light';
}

/** Turn the selector value ('auto' | 'light' | 'moderate' | 'heavy') into a level. */
export function resolveLevel(config, setting, date = new Date()) {
  return setting && setting !== 'auto' && config.levels[setting] ? setting : levelForHour(config, date.getHours());
}

/** Travel-time multiplier for the traffic setting (1 = clear road). */
export function trafficFactor(config, setting, date = new Date()) {
  return config.levels[resolveLevel(config, setting, date)]?.factor || 1;
}

/** Traffic multiplier, reduced if a green-corridor request was logged for this emergency. */
export function totalFactor(config, setting, corridorRequested, date = new Date()) {
  return trafficFactor(config, setting, date) * (corridorRequested ? config.corridor_factor || 1 : 1);
}
