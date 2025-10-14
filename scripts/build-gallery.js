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
const driveViewUrl = (id) =>
  `https://drive.google.com/uc?export=view&id=${id}`;

const driveThumbUrl = (id, size = 'w600-h600') =>
  `https://drive.google.com/thumbnail?id=${id}&sz=${size}`;

/*******************************************************/

/**
 * Query Drive v3 and return an array of files (handles pagination).
 * Adds concise console output to aid debugging inside CI.
 */
async function driveList(query, label, fields = 'id,name,mimeType,thumbnailLink,createdTime', orderBy = 'createdTime desc') {
  const base = 'https://www.googleapis.com/drive/v3/files';
  const files = [];
  let pageToken;

  do {
    const url = new URL(base);
    url.search = new URLSearchParams({
      key: KEY,
      q: query,
      fields: `nextPageToken, files(${fields})`,
      pageSize: '1000',
      orderBy,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      corpora: 'allDrives',
      pageToken: pageToken || ''
    });

    const res = await fetch(url);
    const body = await res.json();

    // ---- debug output ------------------------------------------------------
    console.log(`📡  Drive query [${label}] → status ${res.status}`);
    if (!res.ok) {
      console.log(JSON.stringify(body, null, 2).slice(0, 400));
      throw new Error(`Drive API ${res.status}: ${body.error?.message ?? 'unknown error'}`);
    }
    // Show only first page’s brief content
    if (!pageToken) console.log(JSON.stringify(body, null, 2).slice(0, 400));
    // -----------------------------------------------------------------------

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
    'id,name,mimeType,createdTime',
    'createdTime desc'
  );

  if (!albums.length) throw new Error('No sub-folders found — check sharing settings or folder ID');

  const gallery = {};

  // 2) For each album, list images
  for (const alb of albums) {
    const pics = await driveList(
      `'${alb.id}' in parents and mimeType contains 'image/' and trashed=false`,
      `list pics of ${alb.name}`,
      'id,name,mimeType,createdTime',
      'name asc'
    );

    if (!pics.length) continue; // skip empty albums

    // Sort by name (or switch to createdTime if you prefer)
    pics.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 3) Map to public-safe URLs
    gallery[alb.name] = pics.map(p => ({
      name: p.name || p.id,
      thumb: driveThumbUrl(p.id),         // ✅ public thumbnail
      url:   driveViewUrl(p.id),          // ✅ public, embeddable
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
