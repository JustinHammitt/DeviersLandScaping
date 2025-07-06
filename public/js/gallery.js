// public/js/gallery.js
document.addEventListener('DOMContentLoaded', () => {
  const grid    = document.querySelector('.album-grid');
  const loading = document.getElementById('loading');

  fetch('data/galleryData.json')
    .then(res => res.json())
    .then(gallery => {
      // gallery is an object: { "2025-03-27": [ {thumb,url,name}, … ], … }
      Object.entries(gallery).forEach(([albumName, pics]) => {
        const album = document.createElement('div');
        album.className = 'album';

        pics.forEach((pic, i) => {
          const a = document.createElement('a');
          a.href = pic.url;
          a.setAttribute('data-lightbox', albumName);
          a.setAttribute('data-title', `${albumName}: ${pic.name}`);

          if (i === 0) {
            const img = document.createElement('img');
            img.src = pic.thumb;
            img.alt = pic.name;
            a.appendChild(img);

            const cap = document.createElement('p');
            cap.textContent = albumName;
            album.append(a, cap);
          } else {
            // hide the extra <a> tags — they still fuel the Lightbox gallery
            a.style.display = 'none';
            album.appendChild(a);
          }
        });

        grid.appendChild(album);
      });
    })
    .catch(err => console.error('Gallery load failed:', err))
    .finally(() => {
      loading.style.display = 'none';
      grid.removeAttribute('hidden');
    });
});
