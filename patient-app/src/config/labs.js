// The lab values a person can type in from a report. Each belongs to one organ (config/organs.js).
// There is NO reference range here on purpose: the "normal" range is whatever is printed on the person's own report.
export const LABS = [
  { key: 'hba1c', organ: 'pancreas', unit: '%' },
  { key: 'fasting_glucose', organ: 'pancreas', unit: 'mg/dL' },
  { key: 'creatinine', organ: 'kidneys', unit: 'mg/dL' },
  { key: 'egfr', organ: 'kidneys', unit: 'mL/min' },
  { key: 'alt', organ: 'liver', unit: 'U/L' },
  { key: 'ast', organ: 'liver', unit: 'U/L' },
  { key: 'bilirubin', organ: 'liver', unit: 'mg/dL' },
  { key: 'cholesterol', organ: 'heart', unit: 'mg/dL' },
  { key: 'ldl', organ: 'heart', unit: 'mg/dL' },
];
export const labByKey = (k) => LABS.find((l) => l.key === k) || null;
