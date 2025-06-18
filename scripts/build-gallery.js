// scripts/build-gallery.js
// Run inside GitHub Actions. Generates data/galleryData.json
import fs from 'node:fs/promises';
import fetch from 'node-fetch';

// TODO: replace with your real folder ID (string after .../folders/<ID>)
const ROOT_ID = '1PV0w1kL27aW6hxfsABfgeHg4LGCoFttl';

const KEY     = process.env.GDRIVE_KEY;
const FOLDER  = 'application/vnd.google-apps.folder';

const list = async q => {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.search = new URLSearchParams({
    key: KEY,
    q,
    fields: 'files(id,name,mimeType,thumbnailLink)',
    pageSize: 1000,
  });
  return (await (await fetch(url)).json()).files;
};

export default async function build() {
  const albums = await list(`'${ROOT_ID}' in parents and mimeType='${FOLDER}'`);
  const out = {};

  for (const album of albums) {
    const pics = await list(`'${album.id}' in parents and mimeType contains 'image/'`);
    if (!pics.length) continue;

    pics.sort((a, b) => a.name.localeCompare(b.name));

    out[album.name] = pics.map(p => ({
      name : p.name,
      thumb: p.thumbnailLink.replace(/=s\\d+/, '=w600-h600'),
      url  : `https://drive.google.com/uc?export=view&id=${p.id}`,
    }));
  }

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/galleryData.json', JSON.stringify(out, null, 2));
  console.log('✓ galleryData.json updated');
}

if (import.meta.url === `file://${process.argv[1]}`) build();
