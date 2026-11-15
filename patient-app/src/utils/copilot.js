// The Health Copilot is NOT an AI model. It is a fixed list of questions; each answer is built by simple rules from the person's
// own data (readings against their own usual ranges, what is missing, who would be told). No free text, no medical advice, no diagnosis.
// An answer is { lines: [{ k: i18nKey, p: params }], links: [{ to, k }], from: [source keys] }.
export const QUESTIONS = ['readings', 'missing', 'changes', 'circle', 'records', 'doctor'];

const line = (k, p) => ({ k, p });
const names = (rows, t) => rows.map((r) => t(r)).join(', ');

// ctx: { rows: [{key, value, within}], done: {percent, missing}, history, contacts, consents, reports, labs }.
// `name(key)` turns a metric key into its translated name (passed in so this file stays free of i18n).
export function answer(q, ctx, name) {
  const rows = ctx.rows || [];
  const out = rows.filter((r) => r.within === false);
  const ins = rows.filter((r) => r.within === true);
  const none = rows.filter((r) => r.within === null || r.within === undefined);
  switch (q) {
    case 'readings': {
      if (!ins.length && !out.length) return { lines: [line('cp.a.readings.none')], links: [{ to: '/monitor', k: 'nav.monitor' }], from: ['vitals', 'ranges'] };
      const lines = [];
      if (ins.length) lines.push(line('cp.a.readings.in', { names: names(ins.map((r) => r.key), name) }));
      if (out.length) lines.push(line('cp.a.readings.out', { names: names(out.map((r) => r.key), name) }));
      if (none.length) lines.push(line('cp.a.readings.noRange', { names: names(none.map((r) => r.key), name) }));
      return { lines, links: [{ to: '/monitor', k: 'nav.monitor' }], from: ['vitals', 'ranges'] };
    }
    case 'missing': {
      const m = (ctx.done && ctx.done.missing) || [];
      return m.length
        ? { lines: [line('cp.a.missing.some', { percent: ctx.done.percent, items: m.map((k) => 'overview.item.' + k) }), ...m.map((k) => line('cp.a.missing.item', { item: k }))], links: [{ to: '/overview', k: 'nav.overview' }], from: ['profile', 'contacts', 'reports', 'ranges'] }
        : { lines: [line('cp.a.missing.none')], links: [], from: ['profile', 'contacts', 'reports', 'ranges'] };
    }
    case 'changes': {
      const h = ctx.history || {};
      const lines = Object.keys(h).filter((k) => (h[k] || []).length >= 2).map((k) => {
        const s = h[k]; return line('cp.a.changes.row', { key: k, first: s[0], last: s[s.length - 1], n: s.length });
      });
      return { lines: lines.length ? lines : [line('cp.a.changes.none')], links: [{ to: '/monitor', k: 'nav.monitor' }], from: ['vitals'] };
    }
    case 'circle': {
      const n = (ctx.contacts || []).length;
      const shared = ['location', 'history', 'vitals', 'reports'].filter((k) => ctx.consents && ctx.consents[k] === true);
      return { lines: [n ? line('cp.a.circle.some', { n }) : line('cp.a.circle.none'), shared.length ? line('cp.a.circle.shared', { items: shared.map((k) => 'consent.' + k + '.title') }) : line('cp.a.circle.nothing')], links: [{ to: '/care-circle', k: 'nav.care' }], from: ['contacts', 'consents'] };
    }
    case 'records': {
      const r = (ctx.reports || []).length; const l = (ctx.labs || []).length;
      return { lines: [line('cp.a.records.files', { n: r }), line('cp.a.records.labs', { n: l }), line('cp.a.records.review')], links: [{ to: '/report-intelligence', k: 'nav.reports' }], from: ['reports', 'labs'] };
    }
    case 'doctor': {
      const lines = [];
      if (out.length) lines.push(line('cp.a.doctor.out', { names: names(out.map((r) => r.key), name) }));
      if (ctx.done && ctx.done.missing && ctx.done.missing.includes('baseline')) lines.push(line('cp.a.doctor.baseline'));
      if (!(ctx.reports || []).length && !(ctx.labs || []).length) lines.push(line('cp.a.doctor.noReports'));
      lines.push(line('cp.a.doctor.meds'), line('cp.a.doctor.symptoms'));
      return { lines, links: [], from: ['vitals', 'ranges', 'reports'] };
    }
    default:
      return null;
  }
}
