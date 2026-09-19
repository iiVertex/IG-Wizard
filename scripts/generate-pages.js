#!/usr/bin/env node
// Replaces the paper grid inside each subject page with one rendered from the
// manifest. Everything outside the grid is left byte-for-byte untouched.
// Usage: node scripts/generate-pages.js [--write] [--only <page.html>]
'use strict';

const fs = require('fs');
const path = require('path');
const { SUBJECTS } = require('./subjects');
const { renderGrid } = require('./render');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

const GRID_OPEN = /^\s*<div class="grid grid-cols-1 md:grid-cols-2[^"]*">\s*$/;
const H2 = /<h2 class="text-2xl font-bold mb-4">([^<]*)<\/h2>/;
const HREF = /href="([^"]+\.(?:pdf|zip))"/gi;

// Walk forward from the grid's opening line to its matching close, counting
// nested divs. The pages are hand-written, so tag balance is the only reliable
// boundary: line numbers drift between subjects.
function findGrid(lines) {
  const start = lines.findIndex((l) => GRID_OPEN.test(l));
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    const opens = (lines[i].match(/<div\b/g) || []).length;
    const closes = (lines[i].match(/<\/div>/g) || []).length;
    depth += opens - closes;
    if (depth === 0) return { start, end: i };
  }
  return null;
}

// Keep each page's own section titles ("Paper 1 (MCQ Core)") rather than
// flattening them to a generic label.
function existingLabels(block) {
  const labels = new Map();
  for (const line of block) {
    const m = H2.exec(line);
    if (!m) continue;
    const num = /Paper\s+(\d+)/i.exec(m[1]);
    if (num) labels.set(Number(num[1]), m[1]);
  }
  return labels;
}

function linksIn(text) {
  const found = new Set();
  let m;
  while ((m = HREF.exec(text)) !== null) {
    found.add(decodeURI(m[1]).replace(/^\.\//, ''));
  }
  return found;
}

function generate({ write = false, only = null } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(DOCS, 'data', 'papers.json'), 'utf8'));
  const results = [];

  for (const cfg of SUBJECTS) {
    if (only && cfg.page !== only) continue;
    const file = path.join(DOCS, cfg.page);
    if (!fs.existsSync(file)) {
      results.push({ page: cfg.page, error: 'page not found' });
      continue;
    }

    const original = fs.readFileSync(file, 'utf8');
    // These pages are CRLF on disk. Generate with plain newlines, then restore
    // whatever the file already used so we do not leave it mixed.
    const eol = original.includes('\r\n') ? '\r\n' : '\n';
    const lines = original.split(/\r?\n/);
    const grid = findGrid(lines);
    if (!grid) {
      results.push({ page: cfg.page, error: 'grid not found' });
      continue;
    }

    const block = lines.slice(grid.start, grid.end + 1);
    const labels = existingLabels(block);
    const records = manifest.papers.filter(
      (p) => p.board === cfg.board && p.subject === cfg.subject
    );

    const rendered = renderGrid(lines[grid.start], records, labels);
    const updated = [...lines.slice(0, grid.start), rendered, ...lines.slice(grid.end + 1)]
      .join('\n')
      .replace(/\r?\n/g, eol);

    // Gate: everything outside the grid must be identical, and no link that
    // worked before may disappear.
    const outsideBefore = [...lines.slice(0, grid.start), ...lines.slice(grid.end + 1)].join('\n');
    const updatedLines = updated.split(/\r?\n/);
    const newGrid = findGrid(updatedLines);
    const outsideAfter = [
      ...updatedLines.slice(0, newGrid.start),
      ...updatedLines.slice(newGrid.end + 1),
    ].join('\n');

    const before = linksIn(block.join('\n'));
    const after = linksIn(rendered);
    const workedBefore = [...before].filter((u) => fs.existsSync(path.join(DOCS, u)));
    const lost = workedBefore.filter((u) => !after.has(u));
    const added = [...after].filter((u) => !before.has(u));

    results.push({
      page: cfg.page,
      subject: cfg.subject,
      outsideIntact: outsideBefore === outsideAfter,
      linksBefore: before.size,
      linksAfter: after.size,
      workedBefore: workedBefore.length,
      lost,
      added: added.length,
      bytesBefore: Buffer.byteLength(original),
      bytesAfter: Buffer.byteLength(updated),
      updated,
      file,
    });
  }

  if (write) {
    for (const r of results) {
      if (r.error || !r.outsideIntact || r.lost.length) continue;
      fs.writeFileSync(r.file, r.updated);
    }
  }

  return results;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

  const results = generate({ write, only });
  let blocked = 0;

  for (const r of results) {
    if (r.error) { console.log(`  ! ${r.page}: ${r.error}`); blocked++; continue; }
    const kb = (n) => (n / 1024).toFixed(0) + 'KB';
    const flag = !r.outsideIntact ? ' OUTSIDE-CHANGED' : r.lost.length ? ` LOST ${r.lost.length}` : '';
    if (flag) blocked++;
    console.log(
      `  ${r.page.padEnd(28)} links ${String(r.linksBefore).padStart(4)} -> ${String(r.linksAfter).padStart(5)}` +
      `  (+${r.added})  ${kb(r.bytesBefore)} -> ${kb(r.bytesAfter)}${flag}`
    );
    for (const l of r.lost.slice(0, 5)) console.log(`      lost: ${l}`);
  }

  console.log(write ? `\nwritten (${results.length - blocked} pages)` : '\ndry run - pass --write to apply');
  if (blocked) console.log(`${blocked} page(s) blocked by the safety gate`);
}

module.exports = { generate };
