// public/js/gallery.js
document.addEventListener('DOMContentLoaded', () => {
  const jobs = [
    { id: 'job1', title: 'Mulch Install – April 2024', count: 7 },
    { id: 'job2', title: 'Lawn Cleanup – March 2024', count: 7 }
    // …add more albums here
  ];

  const grid = document.querySelector('.album-grid');
  const loading = document.getElementById('loading');

  jobs.forEach(job => {
    const album = document.createElement('div');
    album.className = 'album';
    const base = `assets/portfolio/${job.id}/`;

    for (let i = 1; i <= job.count; i++) {
      const href = `${base}${i}.jpg`;
      const a    = document.createElement('a');
      a.href       = href;
      a.setAttribute('data-lightbox', job.id);
      a.setAttribute('data-title',   job.title);

      if (i === 1) {
        const img = document.createElement('img');
        img.src   = href;
        img.alt   = job.title;
        a.appendChild(img);

        const cap = document.createElement('p');
        cap.textContent = job.title;
        album.append(a, cap);
      } else {
        a.style.display = 'none';
        album.appendChild(a);
      }
    }

    grid.appendChild(album);
  });

  // toggle loading/grid
  loading.style.display = 'none';
  grid.removeAttribute('hidden');
});
