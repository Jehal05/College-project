// Form validation for the profile screen. Returns error KEYS (translated in the screen).
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PHONE = /^\+?[0-9][0-9\- ]{7,14}$/;

export function validateProfile(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'validation.required';
  const age = Number(form.age);
  if (form.age === '' || !Number.isInteger(age) || age < 0 || age > 120) errors.age = 'validation.age';
  if (!BLOOD_GROUPS.includes(form.blood_group)) errors.blood_group = 'validation.bloodGroup';

  const contactErrors = form.contacts.map((c) => {
    const e = {};
    if (!c.name.trim()) e.name = 'validation.required';
    if (!PHONE.test(c.phone.trim())) e.phone = 'validation.phone';
    return e;
  });
  if (contactErrors.some((e) => Object.keys(e).length)) errors.contacts = contactErrors;
  return errors;
}

// "a, b ,c" -> ["a","b","c"]  and back.
export const toList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);
export const fromList = (list) => (list || []).join(', ');
