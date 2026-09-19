#!/usr/bin/env node
// Safety net for the manifest: nothing that is linked and working on the live
// site today may be missing from the index. Read-only.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const HREF_RE = /href\s*=\s*"([^"]*past papers\/[^"]+\.(?:pdf|zip))"/gi;

function htmlLinks() {
  const links = new Map(); // url -> pages that reference it
  for (const file of fs.readdirSync(DOCS)) {
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(DOCS, file), 'utf8');
    let m;
    while ((m = HREF_RE.exec(html)) !== null) {
      let url = m[1].replace(/^\.\//, '').replace(/^docs\//, '');
      try { url = decodeURI(url); } catch (_) { /* keep raw */ }
      if (!links.has(url)) links.set(url, []);
      links.get(url).push(file);
    }
  }
  return links;
}

function main() {
  const manifestPath = path.join(DOCS, 'data', 'papers.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('no manifest - run: node scripts/build-manifest.js');
    process.exit(1);
  }

  const { papers } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const indexed = new Set();
  for (const p of papers) {
    indexed.add(p.url);
    for (const d of p.duplicates || []) indexed.add(d);
  }

  const links = htmlLinks();
  const missing = [];   // linked on site, absent from manifest
  const broken = [];    // linked on site, absent from disk
  for (const [url, pages] of links) {
    const onDisk = fs.existsSync(path.join(DOCS, url));
    if (!onDisk) broken.push({ url, pages });
    else if (!indexed.has(url)) missing.push({ url, pages });
  }

  const linkedSet = new Set(links.keys());
  const unlinked = papers.filter((p) => !linkedSet.has(p.url));

  console.log(`html links:      ${links.size}`);
  console.log(`manifest files:  ${indexed.size}`);
  console.log(`missing:         ${missing.length}   (linked on site but not indexed)`);
  console.log(`broken:          ${broken.length}   (linked on site but not on disk)`);
  console.log(`unlinked:        ${unlinked.length}   (indexed but no page links to it)`);

  const show = (label, rows, fmt) => {
    if (!rows.length) return;
    console.log(`\n${label}:`);
    for (const r of rows.slice(0, 15)) console.log('  ' + fmt(r));
    if (rows.length > 15) console.log(`  ... ${rows.length - 15} more`);
  };

  show('MISSING', missing, (r) => `${r.url}  <- ${[...new Set(r.pages)].join(', ')}`);
  show('BROKEN', broken, (r) => `${r.url}  <- ${[...new Set(r.pages)].join(', ')}`);

  const byType = {};
  for (const u of unlinked) byType[`${u.subject} (${u.board}) ${u.type}`] = (byType[`${u.subject} (${u.board}) ${u.type}`] || 0) + 1;
  if (unlinked.length) {
    console.log('\nUNLINKED by subject/type:');
    for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      console.log(`  ${String(v).padStart(4)}  ${k}`);
    }
  }

  fs.writeFileSync(
    path.join(DOCS, 'data', 'verify-report.json'),
    JSON.stringify({ generated: new Date().toISOString(), missing, broken, unlinked: unlinked.map((u) => u.url) }, null, 2)
  );

  process.exitCode = missing.length ? 1 : 0;
}

main();
