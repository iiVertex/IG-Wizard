// Splits the manifest into one compact file per subject so a page fetches only
// what it needs. Rows are arrays, not objects, and the repeated URL prefix is
// hoisted into the header - between them that is most of the byte count.
'use strict';

const fs = require('fs');
const path = require('path');
const { SUBJECTS } = require('./subjects');

const KEYS = ['year', 'session', 'type', 'component', 'paper', 'variant', 'src', 'path'];
const SRC_LOCAL = 0;
const SRC_EXTERNAL = 1;

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function shardName(cfg) {
  return `${cfg.board}-${slugify(cfg.subject)}.json`;
}

function writeShards(records, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  const index = [];
  for (const cfg of SUBJECTS) {
    const mine = records.filter((r) => r.board === cfg.board && r.subject === cfg.subject);
    if (!mine.length) continue;

    const localBase = `past papers/${cfg.dir}/`;
    const externalBase = cfg.xp
      ? `https://papers.xtremepape.rs/CAIE/IGCSE/${encodeURIComponent(cfg.xp)}/`
      : null;

    const rows = [];
    for (const r of mine) {
      let src;
      let rel;
      if (r.source === 'local') {
        src = SRC_LOCAL;
        rel = r.url.startsWith(localBase) ? r.url.slice(localBase.length) : r.url;
      } else {
        src = SRC_EXTERNAL;
        rel = externalBase && r.url.startsWith(externalBase) ? r.url.slice(externalBase.length) : r.url;
      }
      rows.push([
        r.year, r.session, r.type, r.component,
        r.paper, r.variant, src, rel,
      ]);
    }

    const shard = {
      board: cfg.board,
      subject: cfg.subject,
      syllabus: cfg.syllabus,
      page: cfg.page,
      localBase,
      externalBase,
      keys: KEYS,
      rows,
    };

    const file = shardName(cfg);
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(shard));

    const local = mine.filter((r) => r.source === 'local').length;
    index.push({
      board: cfg.board,
      subject: cfg.subject,
      syllabus: cfg.syllabus,
      page: cfg.page,
      file,
      count: mine.length,
      local,
      external: mine.length - local,
      bytes: fs.statSync(path.join(outDir, file)).size,
    });
  }

  fs.writeFileSync(
    path.join(outDir, 'index.json'),
    JSON.stringify({ generated: new Date().toISOString(), total: records.length, subjects: index })
  );

  return index;
}

module.exports = { writeShards, shardName, KEYS, SRC_LOCAL, SRC_EXTERNAL };
