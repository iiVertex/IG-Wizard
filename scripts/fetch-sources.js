#!/usr/bin/env node
// Caches the upstream index locally so builds are reproducible and offline, and
// so we are not re-fetching someone else's repo on every deploy.
//
// SOURCE: the Moon Papers project, https://github.com/Grade-Boundaries/moon-papers
// LICENCE: CC BY-NC 4.0 - attribution required, non-commercial use only. It is an
//   index of paper codes and filenames and contains no PDFs. Visible credit is
//   owed wherever this data is published.
//
// Only the subjects this site carries are kept - upstream covers 107, we use 13.
// The year cutoff is deliberately NOT applied here: MIN_YEAR stays a build-time
// knob you can change without re-fetching.
//
// Run when you want fresher upstream data: npm run fetch:sources
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { SUBJECTS } = require('./subjects');

const OUT = path.join(__dirname, '..', 'data-sources');
const BASE = 'https://raw.githubusercontent.com/Grade-Boundaries/moon-papers/main/public/';
const FILES = ['igcse_1.json', 'igcse_2.json'];
const CACHE = 'cie-index.json';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`${res.statusCode} for ${url}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const upstream = {};
  for (const file of FILES) {
    const body = await get(BASE + file);
    Object.assign(upstream, JSON.parse(body)); // throws on a truncated download
    console.log(`  fetched ${file}  ${(body.length / 1024).toFixed(0)} KB`);
  }

  const slim = {};
  const missing = [];
  let rows = 0;
  for (const cfg of SUBJECTS) {
    if (!cfg.xp) continue;
    if (!upstream[cfg.xp]) { missing.push(`${cfg.subject} (${cfg.xp})`); continue; }
    slim[cfg.xp] = upstream[cfg.xp];
    rows += upstream[cfg.xp].length;
  }

  if (missing.length) {
    console.error('\nupstream is missing subjects we carry:');
    for (const m of missing) console.error('  ' + m);
    process.exit(1);
  }

  const json = JSON.stringify(slim);
  fs.writeFileSync(path.join(OUT, CACHE), json);

  // The raw downloads are no longer needed once the slim cache is written.
  for (const file of FILES) {
    const stale = path.join(OUT, file);
    if (fs.existsSync(stale)) fs.unlinkSync(stale);
  }

  console.log(`\ncached ${Object.keys(slim).length} subjects, ${rows} rows, ${(json.length / 1024).toFixed(0)} KB -> data-sources/${CACHE}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
