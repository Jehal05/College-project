// Form validation for the profile screen. Returns error KEYS (translated in the screen).
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function validateProfile(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'validation.required';
  const age = Number(form.age);
  if (form.age === '' || !Number.isInteger(age) || age < 0 || age > 120) errors.age = 'validation.age';
  if (!BLOOD_GROUPS.includes(form.blood_group)) errors.blood_group = 'validation.bloodGroup';

  return errors;
}

// "a, b ,c" -> ["a","b","c"]  and back.
export const toList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);
export const fromList = (list) => (list || []).join(', ');

// Phone rule: remove spaces and dashes, then an optional + and 8 to 15 digits.
export const isValidPhone = (text) => /^\+?\d{8,15}$/.test(String(text).replace(/[\s-]/g, ''));

export const RELATIONS = ['Mother', 'Father', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'];

// Check the add/edit contact form. Returns { field: errorKey }.
export function validateContact(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'validation.required';
  if (!RELATIONS.includes(form.relation)) errors.relation = 'validation.relation';
  if (!isValidPhone(form.phone)) errors.phone = 'validation.phone';
  return errors;
}

export const REPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_REPORT_BYTES = 2 * 1024 * 1024;

// Check a chosen report file before uploading. Returns an error key or null.
export function validateReportFile(file) {
  if (!REPORT_TYPES.includes(file.type)) return 'validation.fileType';
  if (file.size > MAX_REPORT_BYTES) return 'validation.fileSize';
  if (file.size === 0) return 'validation.fileEmpty';
  return null;
}
