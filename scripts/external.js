// Turns the cached upstream index into records in our own shape.
// No PDFs are downloaded: CIE URLs are built from the paper code itself.
//
// The cache comes from Moon Papers (CC BY-NC 4.0): attribution required,
// non-commercial use only. See scripts/fetch-sources.js.
'use strict';

const fs = require('fs');
const path = require('path');
const { SUBJECTS, CIE_SESSIONS, MIN_YEAR } = require('./subjects');
const { splitComponent, parseCie } = require('./parse');

const SOURCE_DIR = path.join(__dirname, '..', 'data-sources');
const SOURCE_FILE = 'cie-index.json';
const XP_BASE = 'https://papers.xtremepape.rs/CAIE/IGCSE/';

// Upstream encodes a row as [year, month, type, component, filename].
const MONTH_TO_SESSION = { 3: 'm', 6: 's', 11: 'w' };

function loadSources() {
  const full = path.join(SOURCE_DIR, SOURCE_FILE);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function buildUrl(xpSubject, filename) {
  // Subject folders contain spaces and parentheses; encode the path segments
  // but leave the separators intact.
  return XP_BASE + encodeURIComponent(xpSubject) + '/' + encodeURIComponent(filename);
}

function externalRecords() {
  const sources = loadSources();
  if (!sources) return { records: [], skipped: ['no cached sources - run: npm run fetch:sources'] };

  const records = [];
  const skipped = [];
  let dropped = 0;

  for (const cfg of SUBJECTS) {
    if (!cfg.xp) continue; // Edexcel has no constructible URL scheme
    const rows = sources[cfg.xp];
    if (!rows) {
      skipped.push(`${cfg.subject}: upstream key not found (${cfg.xp})`);
      continue;
    }

    for (const [yy, month, type, rawComponent, filename] of rows) {
      const session = MONTH_TO_SESSION[month] || null;
      const year = yy ? 2000 + Number(yy) : null;

      // Undated syllabus material (specimen sets, example responses) has no
      // session and no year; keep it, but flagged as extra rather than a paper.
      const component = rawComponent === null || rawComponent === undefined
        ? null
        : String(Math.trunc(Number(rawComponent)));
      const { paper, variant } = splitComponent(component);

      // Upstream flattens inserts and confidential instructions into "other".
      // Our own parser reads the code properly, so prefer it and fall back to
      // the upstream row only for files it cannot read.
      const parsed = parseCie(filename, cfg);
      const fields = parsed && parsed.session ? {
        year: parsed.year,
        session: parsed.session,
        sessionName: parsed.sessionName,
        type: parsed.type,
        component: parsed.component,
        paper: parsed.paper,
        variant: parsed.variant,
      } : {
        year,
        session,
        sessionName: session ? CIE_SESSIONS[session].name : null,
        type,
        component,
        paper,
        variant,
      };

      // Undated syllabus material has no session to compare, so it stays.
      if (fields.year && fields.year < MIN_YEAR) {
        dropped++;
        continue;
      }

      records.push({
        board: 'cambridge',
        subject: cfg.subject,
        syllabus: cfg.syllabus,
        ...fields,
        url: buildUrl(cfg.xp, filename),
        source: 'xtremepapers',
        page: cfg.page,
        xp: cfg.xp,
        ...(type === 'other' ? { label: filename.replace(/\.pdf$/i, '') } : {}),
      });
    }
  }

  return { records, skipped, dropped };
}

module.exports = { externalRecords, buildUrl };
