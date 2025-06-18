// build-gallery.js — run in GitHub Actions to generate data/galleryData.json
// Usage: node scripts/build-gallery.js
// Requires env var GDRIVE_KEY (API key restricted to Google Drive) and
// the Public‑Gallery folder ID below.

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

/********************  CONFIG  *************************/
// Google Drive folder shared "Anyone with the link -> Viewer"
const ROOT_ID = '1PV0w1kL27aW6hxfsABfgeHg4LGCoFttl'; // <-- replace if you move the gallery root

// GitHub secret name: GDRIVE_KEY
const KEY = process.env.GDRIVE_KEY;
if (!KEY) throw new Error('❌  GDRIVE_KEY env var is missing');

const FOLDER_MIME = 'application/vnd.google-apps.folder';
/*******************************************************/

/**
 * Query Drive v3 and return an array of files.
 * Adds concise console output to aid debugging inside CI.
 */
async function driveList(query, label) {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.search = new URLSearchParams({
    key: KEY,
    q: query,
    fields: 'files(id,name,mimeType,thumbnailLink)',
    pageSize: 1000,
  });

  const res = await fetch(url);
  const body = await res.json();

  // ---- debug output ------------------------------------------------------
  console.log(`📡  Drive query [${label}] → status ${res.status}`);
  console.log(JSON.stringify(body, null, 2).slice(0, 400)); // first 400 chars
  // -----------------------------------------------------------------------

  if (!res.ok) {
    throw new Error(`Drive API ${res.status}: ${body.error?.message ?? 'unknown error'}`);
  }

  return body.files ?? [];
}

/**
 * Build galleryData.json and write to the repo.
 */
export default async function build() {
  const albums = await driveList(`'${ROOT_ID}' in parents and mimeType='${FOLDER_MIME}'`, 'list albums');

  if (!albums.length) throw new Error('No sub‑folders found — check sharing settings or folder ID');

  const gallery = {};

  for (const alb of albums) {
    const pics = await driveList(`'${alb.id}' in parents and mimeType contains 'image/'`, `list pics of ${alb.name}`);
    if (!pics.length) continue; // skip empty albums

    pics.sort((a, b) => a.name.localeCompare(b.name));

    gallery[alb.name] = pics.map(p => ({
      name: p.name,
      thumb: p.thumbnailLink?.replace(/=s\d+/, '=w600-h600'),
      url: `https://drive.google.com/uc?export=view&id=${p.id}`,
    }));
  }

  // Write out JSON
  const outPath = path.join('data', 'galleryData.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(gallery, null, 2));
  console.log(`✅  Wrote ${outPath} with ${Object.keys(gallery).length} album(s)`);
}

// If invoked directly via `node ...`, run build()
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(err => {
    console.error('❌  Build failed:', err.message);
    process.exit(1);
  });
}
