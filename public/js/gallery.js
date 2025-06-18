// public/js/gallery.js
(async () => {
  const res    = await fetch('data/galleryData.json');
  const albums = await res.json();

  const grid    = document.querySelector('.album-grid');
  const loading = document.getElementById('loading');

  for (const [album, pics] of Object.entries(albums)) {
    if (!pics.length) continue;

    const card = document.createElement('div');
    card.className = 'album';

    // cover thumbnail
    const cover = pics[0];
    const aCover = document.createElement('a');
    aCover.href = cover.url;
    aCover.dataset.lightbox = album;
    aCover.dataset.title = album;
    aCover.innerHTML = `<img src="${cover.thumb}" alt="${album}">`;
    card.appendChild(aCover);

    card.insertAdjacentHTML('beforeend',
      `<p>${album.replace(/^\\d{4}-\\d{2}-/, '')}</p>`);

    // rest of photos (hidden links)
    pics.slice(1).forEach(p => {
      const a = document.createElement('a');
      a.href = p.url;
      a.dataset.lightbox = album;
      a.dataset.title = p.name;
      a.style.display = 'none';
      card.appendChild(a);
    });

    grid.appendChild(card);
  }

  loading.remove();
  grid.hidden = false;
})();
