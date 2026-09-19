// Filename -> structured record. Every parser returns null on no-match so the
// builder can report what it could not read instead of silently dropping it.
'use strict';

const { CIE_SESSIONS, CIE_TYPES, EDEXCEL_MONTHS } = require('./subjects');

// CIE: 0610_w24_qp_11.pdf  ->  syllabus 0610, Oct/Nov 2024, QP, paper 1 variant 1
const CIE_RE = /^(\d{4})_([msw])(\d{2})_([a-z][a-z0-9])(?:_(\d{1,2}))?\.(?:pdf|zip)$/i;

// A CIE component is two digits: paper then variant. Single-variant syllabuses
// use a leading zero (01 = paper 1, no variant) rather than a variant digit.
function splitComponent(component) {
  if (!component) return { paper: null, variant: null };
  const padded = component.length === 1 ? `0${component}` : component;
  if (padded[0] === '0') return { paper: Number(padded[1]), variant: null };
  return { paper: Number(padded[0]), variant: Number(padded[1]) };
}

// Specimen material sits outside the session scheme: no m/s/w letter, and the
// folder rather than the filename is what marks it.
function parseSpecimen(filename, cfg, relPath) {
  if (!/specimen/i.test(relPath) && !/specimen/i.test(filename)) return null;

  const yearMatch = /(20\d{2})/.exec(filename) || /(20\d{2})/.exec(relPath);
  const paperMatch = /paper[-\s_]?(\d)/i.exec(filename);
  const isMs = /mark\s*scheme|markscheme|[_-]ms[_.-]/i.test(filename);

  return {
    board: cfg.board,
    subject: cfg.subject,
    syllabus: cfg.syllabus,
    year: yearMatch ? Number(yearMatch[1]) : null,
    session: 'specimen',
    sessionName: 'Specimen',
    type: isMs ? 'ms' : 'qp',
    component: paperMatch ? paperMatch[1] : null,
    paper: paperMatch ? Number(paperMatch[1]) : null,
    variant: null,
    specimen: true,
  };
}

// Syllabus-level material with no session, e.g. "0417_0983 SRF.pdf".
const CIE_MISC_RE = /^(\d{4})[_\s]/;

function parseCieMisc(filename, cfg) {
  const m = CIE_MISC_RE.exec(filename);
  if (!m) return null;
  return {
    board: 'cambridge',
    subject: cfg.subject,
    syllabus: m[1],
    year: null,
    session: null,
    sessionName: null,
    type: 'other',
    component: null,
    paper: null,
    variant: null,
    label: filename.replace(/\.pdf$/i, ''),
  };
}

function parseCie(filename, cfg, relPath = '') {
  const m = CIE_RE.exec(filename);
  if (m) {
    const [, syllabus, sessionLetter, yy, rawType, component] = m;
    const type = rawType.toLowerCase();
    if (CIE_TYPES[type]) {
      const session = CIE_SESSIONS[sessionLetter.toLowerCase()];
      const { paper, variant } = splitComponent(component);
      return {
        board: 'cambridge',
        subject: cfg.subject,
        syllabus,
        year: 2000 + Number(yy),
        session: session.key,
        sessionName: session.name,
        type,
        component: component || null,
        paper,
        variant,
      };
    }
  }
  return parseSpecimen(filename, cfg, relPath) || parseCieMisc(filename, cfg);
}

// Edexcel grade boundaries carry their session in the filename two ways:
//   2306-intgcse-9-1-subject-grade-boundaries.pdf   (YYMM prefix)
//   grade-boundaries-june-2024-int-gcse.pdf         (spelled out)
const GB_YYMM_RE = /^(\d{2})(\d{2})[_-]/;
const GB_WORDS_RE = /grade-boundaries-([a-z]+)-(\d{4})/i;
const GB_MONTHS = { '01': 'january', '06': 'june', '11': 'november' };

function parseEdexcelGb(filename, cfg) {
  let monthKey = null;
  let year = null;

  const yymm = GB_YYMM_RE.exec(filename);
  const words = GB_WORDS_RE.exec(filename);

  if (yymm) {
    year = 2000 + Number(yymm[1]);
    monthKey = GB_MONTHS[yymm[2]] || null;
  } else if (words) {
    monthKey = words[1].toLowerCase();
    year = Number(words[2]);
  }

  const month = monthKey ? EDEXCEL_MONTHS[monthKey] : null;

  return {
    board: 'edexcel',
    subject: cfg.subject,
    syllabus: cfg.syllabus,
    year,
    session: month ? month.key : null,
    sessionName: month ? month.name : null,
    type: 'gt',
    component: null,
    paper: null,
    variant: null,
    label: filename.replace(/\.pdf$/i, ''),
  };
}

// Edexcel papers: "January 2022 1BR MS.pdf" -> Jan 2022, paper 1, rescheduled, MS.
// Also seen: "January 2022 (R) P2 MS.pdf", "P2.pdf", and a "Noveber" typo.
const EDX_RE = /^(january|february|may|june|october|november|noveber)\s+(\d{4})\s*(.*?)\.(?:pdf|zip)$/i;

function parseEdexcel(filename, cfg, relPath) {
  if (/grade[-_]boundaries|Grade_Boundaries/i.test(filename) || /(^|\/)GB(\/|$)/.test(relPath)) {
    return parseEdexcelGb(filename, cfg);
  }

  const specimen = parseSpecimen(filename, cfg, relPath);
  if (specimen) return specimen;

  const m = EDX_RE.exec(filename);
  if (!m) return null;

  const [, rawMonth, year, rawTail] = m;
  const monthKey = rawMonth.toLowerCase() === 'noveber' ? 'november' : rawMonth.toLowerCase();
  const month = EDEXCEL_MONTHS[monthKey];
  if (!month) return null;

  let tail = rawTail.trim();
  const isMs = /\bMS$/i.test(tail);
  if (isMs) tail = tail.replace(/\s*\bMS$/i, '').trim();

  // Rescheduled sittings are flagged either as a trailing R or a "(R)" token.
  // Rescheduled codes end in R after the tier letter: 1BR, 2HR, 1PR.
  const rescheduled = /\(R\)/i.test(tail) || /\d[A-Za-z]*R$/i.test(tail);
  const code = tail.replace(/\(R\)/gi, '').trim();

  // Paper number comes from the code (1B, 2H, P2) or falls back to the folder.
  let paper = null;
  const codeDigit = /(\d)/.exec(code);
  if (codeDigit) paper = Number(codeDigit[1]);
  if (paper === null) {
    const fromPath = /Paper (\d)/i.exec(relPath);
    if (fromPath) paper = Number(fromPath[1]);
  }

  return {
    board: 'edexcel',
    subject: cfg.subject,
    syllabus: cfg.syllabus,
    year: Number(year),
    session: month.key,
    sessionName: month.name,
    type: isMs ? 'ms' : 'qp',
    component: code || null,
    paper,
    variant: null,
    rescheduled,
  };
}

module.exports = { parseCie, parseEdexcel, splitComponent };
