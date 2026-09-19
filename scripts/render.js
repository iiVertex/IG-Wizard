// Renders the paper grid for one subject page from manifest records.
// Markup here mirrors the hand-written pages exactly: same tags, same classes,
// same indentation. Only the rows themselves come from data.
'use strict';

const SESSION_DISPLAY = {
  m: 'Feb/March', s: 'May/June', w: 'Oct/Nov',
  jan: 'January', may: 'May/June', jun: 'May/June', oct: 'Oct/Nov', nov: 'Oct/Nov',
  specimen: 'Specimen',
};

// Newest first, and within a year the latest sitting first.
const SESSION_ORDER = { w: 4, nov: 4, oct: 4, s: 3, jun: 3, may: 3, m: 2, jan: 1, specimen: 0 };

// Link types shown on the pages, in the order and colour they already use.
const LINK_TYPES = [
  { type: 'qp', label: 'QP', cls: 'text-blue-400' },
  { type: 'ms', label: 'MS', cls: 'text-green-400' },
  { type: 'gt', label: 'GB', cls: 'text-yellow-400' },
  { type: 'in', label: 'IN', cls: 'text-green-400' },
  { type: 'ci', label: 'CI', cls: 'text-green-400' },
  { type: 'i2', label: 'IN-2', cls: 'text-green-400' },
  { type: 'sf', label: 'SF', cls: 'text-green-400' },
];

function sessionKey(rec) {
  return `${rec.year || 0}-${rec.session || 'na'}`;
}

function sessionHeading(rec) {
  const name = SESSION_DISPLAY[rec.session] || rec.sessionName || '';
  return rec.year ? `${name} ${rec.year}`.trim() : name;
}

function rowLabel(rec) {
  if (rec.board === 'edexcel') {
    const base = `Paper ${rec.paper ?? ''}`.trim();
    return rec.rescheduled ? `${base}R` : base;
  }
  if (rec.variant) return `Paper ${rec.paper} Variant ${rec.variant}`;
  return `Paper ${rec.paper}`;
}

// A row is one sitting of one component: its QP, its MS, the session's grade
// thresholds, and any insert or confidential instructions.
function groupRows(records) {
  const rows = new Map();
  const sessionExtras = new Map();

  for (const rec of records) {
    if (rec.type === 'gt') {
      sessionExtras.set(sessionKey(rec), rec);
      continue;
    }
    if (!LINK_TYPES.some((l) => l.type === rec.type)) continue;
    if (rec.paper === null || rec.paper === undefined) continue;

    const key = `${sessionKey(rec)}|${rec.paper}|${rec.variant ?? ''}|${rec.rescheduled ? 'r' : ''}`;
    if (!rows.has(key)) rows.set(key, { sample: rec, links: {} });
    const row = rows.get(key);
    if (!row.links[rec.type]) row.links[rec.type] = rec;
  }

  for (const row of rows.values()) {
    const gt = sessionExtras.get(sessionKey(row.sample));
    if (gt && !row.links.gt) row.links.gt = gt;
  }

  return [...rows.values()];
}

function href(rec) {
  // Local paths keep their raw spaces, matching every link already on the site.
  // External URLs arrive already encoded.
  if (rec.source === 'local') return './' + rec.url;
  return rec.url;
}

function renderRow(row) {
  const out = [];
  out.push('                            <h1 href="#" class="paper-link flex items-center justify-between p-2 rounded">');
  out.push(`                                <span>${rowLabel(row.sample)}</span>`);
  out.push('                                <div class="space-x-2">');
  for (const link of LINK_TYPES) {
    const rec = row.links[link.type];
    if (!rec) continue;
    out.push(`                                    <a class="${link.cls}" href="${href(rec)}">${link.label}</a>`);
  }
  out.push('                                </div>');
  out.push('                            </h1>');
  return out;
}

function renderSection(paperNumber, label, records) {
  const rows = groupRows(records);

  // A session can have grade thresholds but no papers we hold - Edexcel June
  // 2024 Chemistry, for one. Keep the threshold reachable rather than dropping
  // a file we host, using the same row markup with only the GB link filled in.
  const covered = new Set(rows.map((r) => sessionKey(r.sample)));
  for (const gt of records.filter((r) => r.type === 'gt')) {
    if (covered.has(sessionKey(gt))) continue;
    covered.add(sessionKey(gt));
    rows.push({ sample: { ...gt, paper: paperNumber }, links: { gt } });
  }

  const bySession = new Map();
  for (const row of rows) {
    const key = sessionKey(row.sample);
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key).push(row);
  }

  const sessions = [...bySession.entries()].sort((a, b) => {
    const [, ra] = a; const [, rb] = b;
    const x = ra[0].sample; const y = rb[0].sample;
    return (y.year || 0) - (x.year || 0) ||
      (SESSION_ORDER[y.session] || 0) - (SESSION_ORDER[x.session] || 0);
  });

  const out = [];
  out.push(`            <!-- Paper ${paperNumber} Section -->`);
  out.push('            <div class="card p-6 rounded-lg">');
  out.push(`                <h2 class="text-2xl font-bold mb-4">${label}</h2>`);
  out.push('                <div class="space-y-4">');

  for (const [, sessionRows] of sessions) {
    sessionRows.sort((a, b) =>
      (a.sample.variant || 0) - (b.sample.variant || 0) ||
      String(a.sample.component).localeCompare(String(b.sample.component)) ||
      (a.sample.rescheduled ? 1 : 0) - (b.sample.rescheduled ? 1 : 0));

    out.push('                    ');
    out.push('                    <div>');
    out.push(`                        <h3 class="text-lg font-semibold mb-2 text-blue-400">${sessionHeading(sessionRows[0].sample)}</h3>`);
    out.push('                        <div class="space-y-2">');
    for (const row of sessionRows) out.push(...renderRow(row));
    out.push('                        </div>');
    out.push('                    </div>');
  }

  out.push('                    ');
  out.push('                </div>');
  out.push('            </div>');
  return out;
}

function renderGrid(gridOpenTag, records, labels) {
  const byPaper = new Map();
  for (const rec of records) {
    if (rec.paper === null || rec.paper === undefined) continue;
    if (!byPaper.has(rec.paper)) byPaper.set(rec.paper, []);
    byPaper.get(rec.paper).push(rec);
  }

  // Grade thresholds carry no paper number; they belong to every section.
  const thresholds = records.filter((r) => r.type === 'gt');

  const out = [gridOpenTag];
  for (const paper of [...byPaper.keys()].sort((a, b) => a - b)) {
    const label = labels.get(paper) || `Paper ${paper}`;
    out.push(...renderSection(paper, label, byPaper.get(paper).concat(thresholds)));
  }
  out.push('        </div>');
  return out.join('\n');
}

module.exports = { renderGrid, SESSION_DISPLAY, LINK_TYPES };
