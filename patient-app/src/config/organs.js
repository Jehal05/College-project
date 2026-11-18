// The organs shown on the Digital Twin page. Pure data, so the 2D map, the list and the panel always agree.
//  metrics:  live readings that relate to the organ ({ key: vitals field, series: history key or null, unit, range: baseline key or null })
//  words:    lower-case words that link the patient's own conditions and report names to the organ
//  shape:    where it is drawn on the 200 x 420 body map ('ellipse' cx cy rx ry); focus = the zoom box [x, y, w, h]
// Nothing here says what a reading means medically.
export const ORGANS = [
  { key: 'heart', metrics: [{ key: 'heart_rate', series: 'heart_rate', unit: 'overview.unit.bpm', range: 'heart_rate' }, { key: 'bp', series: 'bp_sys', unit: 'overview.unit.mmhg', range: 'bp_systolic' }],
    words: ['hypertension', 'blood pressure', 'heart', 'cardiac', 'ecg', 'ekg', 'cholesterol', 'lipid'],
    shapes: [{ cx: 106, cy: 124, rx: 13, ry: 15 }], focus: [60, 85, 90, 80] },
  { key: 'brain', metrics: [], words: ['brain', 'stroke', 'seizure', 'epilepsy', 'migraine', 'mri', 'neuro'],
    shapes: [{ cx: 100, cy: 32, rx: 17, ry: 13 }], focus: [60, 0, 80, 70] },
  { key: 'lungs', metrics: [{ key: 'spo2', series: 'spo2', unit: 'overview.unit.percent', range: 'spo2' }, { key: 'resp_rate', series: null, unit: 'overview.unit.perMinute', range: null }],
    words: ['lung', 'asthma', 'copd', 'breath', 'respiratory', 'x-ray', 'xray', 'spirometry'],
    shapes: [{ cx: 80, cy: 112, rx: 15, ry: 24 }, { cx: 126, cy: 112, rx: 15, ry: 24 }], focus: [50, 80, 110, 80] },
  { key: 'kidneys', metrics: [], words: ['kidney', 'renal', 'creatinine', 'egfr', 'dialysis', 'urea'],
    shapes: [{ cx: 77, cy: 178, rx: 7, ry: 12 }, { cx: 129, cy: 178, rx: 7, ry: 12 }], focus: [55, 150, 100, 60] },
  { key: 'liver', metrics: [], words: ['liver', 'hepat', 'lft', 'bilirubin', 'sgpt', 'sgot', 'alt', 'ast'],
    shapes: [{ cx: 86, cy: 152, rx: 24, ry: 12 }], focus: [55, 125, 100, 60] },
  { key: 'pancreas', metrics: [{ key: 'glucose', series: 'glucose', unit: 'overview.unit.glucose', range: 'glucose' }],
    words: ['diabetes', 'glucose', 'sugar', 'hba1c', 'insulin', 'pancrea'],
    shapes: [{ cx: 110, cy: 167, rx: 18, ry: 6 }], focus: [60, 140, 90, 50] },
];
export const organByKey = (k) => ORGANS.find((o) => o.key === k) || ORGANS[0];

const hit = (text, words) => words.some((w) => String(text).toLowerCase().includes(w));
// The patient's own conditions and report names that mention one of the organ's words.
export const relatedConditions = (organ, conditions) => (conditions || []).filter((c) => hit(c, organ.words));
export const relatedReports = (organ, reports) => (reports || []).filter((r) => hit(r.name, organ.words));
