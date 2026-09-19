#!/usr/bin/env node
// Walks docs/past papers/ and emits a normalized index of every PDF on disk.
// This is additive: it writes docs/data/ and touches nothing that already ships.
'use strict';

const fs = require('fs');
const path = require('path');
const { BY_DIR, SUBJECTS, MIN_YEAR } = require('./subjects');
const { parseCie, parseEdexcel } = require('./parse');
const { externalRecords } = require('./external');
const { writeShards } = require('./shard');

const ROOT = path.join(__dirname, '..');
const PAPERS_DIR = path.join(ROOT, 'docs', 'past papers');
const OUT_DIR = path.join(ROOT, 'docs', 'data');

// Browser-downloaded second copies: 'name (1).pdf'.
const IS_COPY = / [(][0-9]+[)][.](pdf|zip)$/i;

// Papers ship as PDFs; ICT source files ship as zips.
const ASSET_EXT = /[.](pdf|zip)$/i;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && ASSET_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

function slug(text) {
  return text ? String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
}

function makeId(rec) {
  return [
    rec.board,
    rec.syllabus,
    rec.year || 'na',
    rec.session || 'na',
    rec.type,
    rec.component || 'na',
    rec.rescheduled ? 'r' : '',
    // Session-less extras (grade boundaries, syllabus notes) would otherwise all
    // share one id and collapse into a single record.
    rec.session ? '' : slug(rec.label),
  ].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function build() {
  const records = [];
  const unparsed = [];
  const seen = new Map();

  for (const cfg of SUBJECTS) {
    const dir = path.join(PAPERS_DIR, cfg.dir);
    if (!fs.existsSync(dir)) {
      console.warn(`  ! missing folder: ${cfg.dir}`);
      continue;
    }

    for (const full of walk(dir)) {
      // Browser-downloaded copies land as 'name (1).pdf'; they are byte-identical
      // to the original, so read them under the real name and let dedupe drop them.
      const filename = path.basename(full).replace(/ [(][0-9]+[)][.](pdf|zip)$/i, '.$1');
      const url = path.relative(path.join(ROOT, 'docs'), full).split(path.sep).join('/');
      const relPath = path.relative(dir, full).split(path.sep).join('/');

      const parsed = cfg.board === 'cambridge'
        ? parseCie(filename, cfg, relPath)
        : parseEdexcel(filename, cfg, relPath);

      if (!parsed) {
        unparsed.push(url);
        continue;
      }

      const rec = { id: makeId(parsed), ...parsed, url, source: 'local', page: cfg.page };
      if (cfg.xp) rec.xp = cfg.xp;

      // Grade thresholds and reports repeat across folders; keep one canonical
      // file and remember the rest, preferring the original over a ' (1)' copy.
      if (seen.has(rec.id)) {
        const kept = seen.get(rec.id);
        if (IS_COPY.test(kept.url) && !IS_COPY.test(url)) {
          kept.duplicates.push(kept.url);
          kept.url = url;
        } else {
          kept.duplicates.push(url);
        }
        continue;
      }
      rec.duplicates = [];
      seen.set(rec.id, rec);
      records.push(rec);
    }
  }

  // --- external records ---------------------------------------------------
  // Upstream fills the sessions we do not hold locally. A file we already host
  // always wins: it is faster, and it does not depend on anyone else's uptime.
  // Dedupe is by filename, which is globally unique for CIE paper codes.
  const localFiles = new Set();
  for (const rec of records) {
    localFiles.add(path.basename(rec.url).toLowerCase());
    for (const d of rec.duplicates || []) localFiles.add(path.basename(d).toLowerCase());
  }

  const { records: external, skipped, dropped } = externalRecords();
  let added = 0;
  let mirrored = 0;

  for (const ext of external) {
    const filename = decodeURIComponent(path.basename(ext.url)).toLowerCase();
    if (localFiles.has(filename)) {
      mirrored++;
      continue;
    }
    const rec = { id: makeId(ext), ...ext };
    if (seen.has(rec.id)) continue;
    seen.set(rec.id, rec);
    records.push(rec);
    added++;
  }

  // A missing cache used to warn and carry on, which meant a deploy could
  // quietly ship a fraction of the catalogue. Refuse to build instead.
  if (skipped.length) {
    for (const msg of skipped) console.error('  ! ' + msg);
    throw new Error('external sources unavailable - refusing to build a partial index');
  }

  records.sort((a, b) =>
    a.board.localeCompare(b.board) ||
    a.subject.localeCompare(b.subject) ||
    (b.year || 0) - (a.year || 0) ||
    String(a.session).localeCompare(String(b.session)) ||
    String(a.component).localeCompare(String(b.component)) ||
    a.type.localeCompare(b.type));

  for (const rec of records) {
    if (rec.duplicates && !rec.duplicates.length) delete rec.duplicates;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'papers.json'),
    JSON.stringify({ generated: new Date().toISOString(), count: records.length, papers: records }, null, 0)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'build-report.json'),
    JSON.stringify({ generated: new Date().toISOString(), total: records.length, externalAdded: added, alreadyLocal: mirrored, unparsed }, null, 2)
  );

  const shards = writeShards(records, path.join(OUT_DIR, 'papers'));

  return { records, unparsed, added, mirrored, shards, dropped };
}

if (require.main === module) {
  const { records, unparsed, added, mirrored, shards, dropped } = build();
  const bySource = {};
  for (const r of records) bySource[r.source] = (bySource[r.source] || 0) + 1;
  console.log(`indexed ${records.length} papers`, bySource);
  console.log(`external: +${added} added, ${mirrored} already held locally, ${dropped} older than ${MIN_YEAR}`);
  const shardBytes = shards.reduce((n, s) => n + s.bytes, 0);
  console.log(`shards: ${shards.length} files, ${(shardBytes / 1024).toFixed(0)} KB total, largest ${(Math.max(...shards.map((s) => s.bytes)) / 1024).toFixed(0)} KB`);
  if (unparsed.length) {
    console.log(`\nunparsed (${unparsed.length}):`);
    for (const u of unparsed.slice(0, 20)) console.log('  ' + u);
    if (unparsed.length > 20) console.log(`  ... ${unparsed.length - 20} more (see docs/data/build-report.json)`);
  }
}

module.exports = { build };
