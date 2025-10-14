// build-gallery.js — run in GitHub Actions to generate data/galleryData.json
// Usage: node scripts/build-gallery.js
// Requires env var GDRIVE_KEY (API key restricted to Google Drive) and
// the Public-Gallery folder ID below.

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

/********************  CONFIG  *************************/
// Google Drive folder shared "Anyone with the link -> Viewer"
const ROOT_ID = '1JJOPzMe_KDYzHrxmmy7X2gBzDGRHeom-'; // <-- replace if you move the gallery root

// GitHub secret name: GDRIVE_KEY
const KEY = process.env.GDRIVE_KEY;
if (!KEY) throw new Error('❌  GDRIVE_KEY env var is missing');

const FOLDER_MIME = 'application/vnd.google-apps.folder';

// Public-safe URL builders
const driveImageUrl = (id) => 
	`https://drive.google.com/uc?export=download&id=${id}`;


const driveThumbUrl = (id, size = 'w600-h600') =>
  `https://drive.google.com/thumbnail?id=${id}&sz=${size}`;
/*******************************************************/

/**
 * Minimal, compatible Drive v3 listing with pagination.
 * Avoids corpora/supportsAllDrives flags that can 400 with API-key only.
 */
async function driveList(query, label, fields = 'id,name,mimeType,thumbnailLink,createdTime') {
  const base = 'https://www.googleapis.com/drive/v3/files';
  const files = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      key: KEY,
      q: query,
      fields: `nextPageToken, files(${fields})`,
      pageSize: '1000'
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `${base}?${params.toString()}`;
    const res = await fetch(url);
    const body = await res.json();

    // ---- debug output (first page only to keep logs light) ---------------
    console.log(`📡  Drive query [${label}] → status ${res.status}`);
    if (!res.ok) {
      console.log(JSON.stringify(body, null, 2).slice(0, 400));
      throw new Error(`Drive API ${res.status}: ${body.error?.message ?? 'unknown error'}`);
    }
    if (!pageToken) console.log(JSON.stringify(body, null, 2).slice(0, 400));
    // ---------------------------------------------------------------------

    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * Build galleryData.json and write to the repo.
 */
export default async function build() {
  // 1) List album folders
  const albums = await driveList(
    `'${ROOT_ID}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    'list albums',
    'id,name,mimeType,createdTime'
  );

  if (!albums.length) {
    throw new Error('No sub-folders found — check sharing settings or folder ID');
  }

  const gallery = {};

  // 2) For each album, list images
  for (const alb of albums) {
    const pics = await driveList(
      `'${alb.id}' in parents and mimeType contains 'image/' and trashed=false`,
      `list pics of ${alb.name}`,
      'id,name,mimeType,createdTime'
    );

    if (!pics.length) continue; // skip empty albums

    // Sort by name (alphabetical)
    pics.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 3) Map to public-safe URLs (no 403s)
    gallery[alb.name] = pics.map(p => ({
      name: p.name || p.id,
      thumb: driveThumbUrl(p.id),   // public thumbnail endpoint
      url:   driveImageUrl(p.id),    // public embeddable view
    }));
  }

  // 4) Write out JSON
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
