// Validation for the hospital onboarding form (feature #47). Pure function.
// A new hospital is always saved as unverified. Only an admin can verify it.
export const CAPABILITY_KEYS = ['cath_lab', 'stroke_unit', 'icu', 'emergency'];

export const emptyHospitalForm = () => ({
  name: '',
  address: '',
  phone: '',
  lat: '',
  lng: '',
  capabilities: { cath_lab: false, stroke_unit: false, icu: false, emergency: true },
  availability: { beds_free: '0', icu_free: '0', cath_lab_ready: false, stroke_unit_ready: false },
});

const isWhole = (v) => /^\d+$/.test(String(v).trim());

/**
 * @returns { ok, errors: { field: message }, value }   value is the clean object to save
 */
export function validateHospital(form) {
  const errors = {};
  const keys = {}; // field -> i18n key of the same message (the screen shows it in the chosen language)
  const fail = (field, key, text) => {
    errors[field] = text;
    keys[field] = key;
  };
  const name = String(form.name ?? '').trim();
  if (name.length < 3) fail('name', 'hf.nameShort', 'Enter the hospital name (at least 3 letters).');
  else if (name.length > 80) fail('name', 'hf.nameLong', 'Name is too long (80 letters at most).');

  const address = String(form.address ?? '').trim();
  if (!address) fail('address', 'hf.address', 'Enter the address.');

  const phone = String(form.phone ?? '').trim();
  if (!/^\+?[0-9][0-9 -]{5,18}[0-9]$/.test(phone)) fail('phone', 'hf.phone', 'Enter a phone number: digits, spaces or dashes, 7 to 20 characters.');

  const lat = Number(String(form.lat).trim());
  const lng = Number(String(form.lng).trim());
  if (String(form.lat).trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) fail('lat', 'hf.lat', 'Latitude must be a number from -90 to 90.');
  if (String(form.lng).trim() === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) fail('lng', 'hf.lng', 'Longitude must be a number from -180 to 180.');

  const caps = form.capabilities || {};
  if (!CAPABILITY_KEYS.some((k) => caps[k])) fail('capabilities', 'hf.caps', 'Tick at least one capability.');

  const a = form.availability || {};
  if (!isWhole(a.beds_free ?? '')) fail('beds_free', 'hf.beds', 'Beds free: a whole number, 0 or more.');
  if (!isWhole(a.icu_free ?? '')) fail('icu_free', 'hf.icu', 'ICU beds free: a whole number, 0 or more.');
  if (a.cath_lab_ready && !caps.cath_lab) fail('cath_lab_ready', 'hf.cathReady', 'The cath lab cannot be ready if the hospital has no cath lab.');
  if (a.stroke_unit_ready && !caps.stroke_unit) fail('stroke_unit_ready', 'hf.strokeReady', 'The stroke unit cannot be ready if the hospital has no stroke unit.');
  if (Number(a.icu_free) > 0 && !caps.icu && isWhole(a.icu_free)) fail('icu_free', 'hf.icuNoIcu', 'ICU beds are free, but the hospital has no ICU ticked.');

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    errorKeys: keys,
    value: ok
      ? {
          name,
          address,
          phone,
          lat,
          lng,
          capabilities: Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, Boolean(caps[k])])),
          availability: {
            beds_free: Number(a.beds_free),
            icu_free: Number(a.icu_free),
            cath_lab_ready: Boolean(a.cath_lab_ready),
            stroke_unit_ready: Boolean(a.stroke_unit_ready),
          },
        }
      : null,
  };
}

/** Turn a saved hospital back into form fields (numbers become text for the inputs). */
export function formFromHospital(h) {
  return {
    name: h.name || '',
    address: h.address || '',
    phone: h.phone || '',
    lat: String(h.lat ?? ''),
    lng: String(h.lng ?? ''),
    capabilities: { ...emptyHospitalForm().capabilities, ...h.capabilities },
    availability: {
      beds_free: String(h.availability?.beds_free ?? 0),
      icu_free: String(h.availability?.icu_free ?? 0),
      cath_lab_ready: Boolean(h.availability?.cath_lab_ready),
      stroke_unit_ready: Boolean(h.availability?.stroke_unit_ready),
    },
  };
}
