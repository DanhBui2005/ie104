// Module trang Yêu Thích: render từ localStorage và cho phép xóa từng bài
(() => {
  // Lấy các phần tử DOM cần thiết
  const ytTbody = document.getElementById('yt-body');
  const playlistCover = document.querySelector('.playlist-cover img');
  const playlistSub = document.querySelector('.playlist .playlist-sub');
  const playlistTitle = document.querySelector('.playlist .playlist-title');

  // Kiểm tra xem có tồn tại phần tử body không
  if (!ytTbody) return;

  // Hàm tải danh sách bài hát yêu thích từ localStorage
  function loadLiked() {
    try {
      const data = localStorage.getItem('liked_songs');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Hàm lấy key tên hiển thị cho người dùng hiện tại
  function getNameKey() {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      if (u && (u.id || u.email)) return `displayname_${u.id || u.email}`;
    } catch {}
    return 'displayname_guest';
  }
  
  // Hàm lấy tên hiển thị của người dùng
  function getDisplayName() {
    try {
      const s = localStorage.getItem(getNameKey());
      return s && s.trim() ? s.trim() : '';
    } catch {
      return '';
    }
  }
  
  // Hàm thiết lập tiêu đề cho playlist yêu thích
  function setFavTitle() {
    if (!playlistTitle) return;
    const name = getDisplayName();
    const fallback = 'bạn';
    playlistTitle.textContent = `Yêu thích của ${name || fallback}`;
  }

  // Hàm lưu danh sách bài hát yêu thích vào localStorage
  function saveLiked(list) {
    try {
      localStorage.setItem('liked_songs', JSON.stringify(list));
      try { window.dispatchEvent(new Event('liked:changed')); } catch {}
    } catch {}
  }

  // Hàm bất đồng bộ để render danh sách bài hát yêu thích
  async function renderLiked() {
    const list = loadLiked();
    ytTbody.innerHTML = '';
    list.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'pt-row';
      row.setAttribute('role', 'row');
      row.setAttribute('data-track-index', String(i));
      row.innerHTML = `
        <div class="pt-col idx">${i + 1}</div>
        <div class="pt-col track">
          <div class="pt-cover" style="background-image:url('${t.cover || ''}')"></div>
          <div>
            <div class="pt-title">${t.title || ''}</div>
          </div>
        </div>
        <div class="pt-col artist">${t.artist || ''}</div>
        <div class="pt-col time">${t.duration || '--:--'}</div>`;
      row.style.cursor = 'pointer';

      // Click vào dòng để play nhạc
      row.addEventListener('click', (e) => {
        if (window.MusicBox && typeof window.MusicBox.playAt === 'function') {
          const playlist = window.MusicBox.playlist();
          const idx = Array.isArray(playlist) ? playlist.findIndex(x => x && x.id === t.id) : -1;
          if (idx >= 0) window.MusicBox.playAt(idx);
        }
      });

      ytTbody.appendChild(row);
    });

    // Update số lượng bài hát
    if (playlistSub) playlistSub.textContent = `Playlist • ${list.length} bài hát`;
    // Update cover nếu có bài đầu tiên
    const first = list[0];
    if (playlistCover && first && first.cover) playlistCover.src = first.cover;

    // Render 'Kết hợp từ các nghệ sĩ' chỉ cho nghệ sĩ có trong yêu thích
    try {
      const wrap = document.querySelector('.artist-list');
      const section = wrap ? wrap.closest('.artist-section') : null;
      if (wrap) {
        // Lấy danh sách nghệ sĩ duy nhất
        const normalize = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
        const artistMap = new Map();
        list.forEach(it => {
          const name = String(it.artist||'').trim(); if (!name) return;
          if (!artistMap.has(name)) artistMap.set(name, { name, cover: it.cover || '' });
        });
        // Thử lấy ảnh nghệ sĩ từ songs.json nếu có
        let catalog = [];
        try {
          const res = await fetch('./assets/music_data/songs.json', { cache: 'no-store' });
          const data = await res.json();
          if (Array.isArray(data)) catalog = data;
        } catch {}
        function findArtistImg(name){
          const n = normalize(name);
          const hit = catalog.find(s => normalize(s.artist) === n);
          return (hit && (hit.artistImg || hit.cover)) || null;
        }
        wrap.innerHTML = '';
        artistMap.forEach((val) => {
          const img = findArtistImg(val.name) || val.cover || '';
          const el = document.createElement('div');
          el.className = 'artist';
          el.innerHTML = `
            <img src="${img}" alt="${val.name}">
            <span>${val.name}</span>
          `;
          wrap.appendChild(el);
        });
        // Toggle section visibility based on whether there are artists
        if (section) {
          section.style.display = artistMap.size ? '' : 'none';
        }
      }
    } catch {}
  }

  // Render khi trang load và khi có thay đổi danh sách thích
  document.addEventListener('DOMContentLoaded', () => {
    renderLiked();
    setFavTitle();
  });
  window.addEventListener('liked:changed', renderLiked);
})();
