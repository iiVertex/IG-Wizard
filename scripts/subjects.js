// Single source of truth: which folder holds which subject, and how it maps
// onto external sources. `xp` is the XtremePapers subject folder (CIE only);
// it is what lets us build an upstream URL from a paper code alone.
'use strict';

// Papers older than this are left out of the index. Files we host locally are
// never filtered - this only trims what we pull from upstream.
const MIN_YEAR = 2019;

const SUBJECTS = [
  // --- Cambridge (CIE) --------------------------------------------------
  { dir: 'accountingciepastpapers', board: 'cambridge', subject: 'Accounting',                 syllabus: '0452', page: 'accountingcambridge.html', xp: 'Accounting (0452)' },
  { dir: 'arabicciepastpapers',     board: 'cambridge', subject: 'Arabic',                     syllabus: '0508', page: 'arabiccambridge.html',     xp: 'Arabic - First Language (0508)' },
  { dir: 'biociepastpapers',        board: 'cambridge', subject: 'Biology',                    syllabus: '0610', page: 'biocambridge.html',        xp: 'Biology (0610)' },
  { dir: 'businessciepastpapers',   board: 'cambridge', subject: 'Business',                   syllabus: '0450', page: 'businesscambridge.html',   xp: 'Business Studies (0450)' },
  { dir: 'chemciepastpapers',       board: 'cambridge', subject: 'Chemistry',                  syllabus: '0620', page: 'chemcambridge.html',       xp: 'Chemistry (0620)' },
  { dir: 'cspastpapers',            board: 'cambridge', subject: 'Computer Science',           syllabus: '0478', page: 'cscambridge.html',         xp: 'Computer Science (0478)' },
  { dir: 'econciepastpapers',       board: 'cambridge', subject: 'Economics',                  syllabus: '0455', page: 'econcambridge.html',       xp: 'Economics (0455)' },
  { dir: 'engfirstpastpapers',      board: 'cambridge', subject: 'English First Language',     syllabus: '0500', page: 'engfirstcambridge.html',   xp: 'English - First Language (0500)' },
  { dir: 'evmpastpapers',           board: 'cambridge', subject: 'Environmental Management',   syllabus: '0680', page: 'evmcambridge.html',        xp: 'Environmental Management (0680)' },
  { dir: 'geociepastpapers',        board: 'cambridge', subject: 'Geography',                  syllabus: '0460', page: 'geographycambridge.html',  xp: 'Geography (0460)' },
  { dir: 'ictciepastpapers',        board: 'cambridge', subject: 'ICT',                        syllabus: '0417', page: 'ictcambridge.html',        xp: 'Information and Communication Technology (0417)' },
  { dir: 'mathciepastpapers',       board: 'cambridge', subject: 'Mathematics',                syllabus: '0580', page: 'mathcambridge.html',       xp: 'Mathematics (0580)' },
  { dir: 'phyciepastpapers',        board: 'cambridge', subject: 'Physics',                    syllabus: '0625', page: 'phycambridge.html',        xp: 'Physics (0625)' },

  // --- Edexcel ----------------------------------------------------------
  // No syllabus code in the filenames; the folder is the only subject signal.
  { dir: 'biopastpapers',      board: 'edexcel', subject: 'Biology',     syllabus: '4BI1', page: 'biologyedexcel.html'   },
  { dir: 'chempastpapers',     board: 'edexcel', subject: 'Chemistry',   syllabus: '4CH1', page: 'chemistryedexcel.html' },
  { dir: 'mathpastpapers',     board: 'edexcel', subject: 'Mathematics', syllabus: '4MA1', page: 'mathedexcel.html'      },
  { dir: 'physicspastpapers',  board: 'edexcel', subject: 'Physics',     syllabus: '4PH1', page: 'physicsedexcel.html'   },
];

const BY_DIR = new Map(SUBJECTS.map((s) => [s.dir, s]));

// CIE session letter -> canonical session data.
const CIE_SESSIONS = {
  m: { key: 'm', name: 'Feb/March', label: 'Feb-March', order: 1 },
  s: { key: 's', name: 'May/June',  label: 'June',      order: 2 },
  w: { key: 'w', name: 'Oct/Nov',   label: 'November',  order: 3 },
};

// CIE document type codes actually present in this archive.
const CIE_TYPES = {
  qp: 'Question Paper',
  ms: 'Mark Scheme',
  gt: 'Grade Thresholds',
  er: 'Examiner Report',
  ci: 'Confidential Instructions',
  in: 'Insert',
  i2: 'Insert 2',
  sf: 'Source Files',
};

const EDEXCEL_MONTHS = {
  january: { key: 'jan', name: 'January', order: 1 },
  may: { key: 'may', name: 'May', order: 2 },
  june: { key: 'jun', name: 'June', order: 3 },
  october: { key: 'oct', name: 'October', order: 4 },
  november: { key: 'nov', name: 'November', order: 5 },
};

module.exports = { SUBJECTS, BY_DIR, CIE_SESSIONS, CIE_TYPES, EDEXCEL_MONTHS, MIN_YEAR };
