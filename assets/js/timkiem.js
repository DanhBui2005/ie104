// Xử lý cụ thể cho trang timkiem.html: hiển thị nghệ sĩ và bài hát theo truy vấn

(function searchArtistAndRender() {
    function normalize(s) {
        return (s || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function getQuery() {
        try {
            return new URLSearchParams(location.search).get("q") || "";
        } catch {
            return "";
        }
    }

    async function getAllSongs() {
        try {
            if (
                window.MusicBox &&
                typeof window.MusicBox.playlist === "function"
            ) {
                const pl = window.MusicBox.playlist();
                if (Array.isArray(pl) && pl.length) return pl;
            }
        } catch {}
        try {
            const res = await fetch("./assets/music_data/songs.json", {
                cache: "no-store",
            });
            const data = await res.json();
            if (Array.isArray(data)) return data;
        } catch {}
        return [];
    }

    function pickArtist(artists, qNorm) {
        const list = artists.map((name) => ({ name, norm: normalize(name) }));
        if (!qNorm) return list[0]?.name || "";

        // Ưu tiên tìm kiếm khớp chính xác đầu tiên
        const exact = list.find((a) => a.norm === qNorm);
        if (exact) return exact.name;

        // Thử tìm kiếm bắt đầu bằng từ khóa
        const startsWith = list.find((a) => a.norm.startsWith(qNorm));
        if (startsWith) return startsWith.name;

        // Thử tìm kiếm chứa từ khóa
        const contains = list.find((a) => a.norm.includes(qNorm));
        if (contains) return contains.name;

        // Thử tìm kiếm nếu truy vấn chứa tên nghệ sĩ
        const reverseContains = list.find((a) => qNorm.includes(a.norm));
        if (reverseContains) return reverseContains.name;

        return list[0]?.name || "";
    }

    function renderArtistHeader(artistName, artistImgUrl) {
        const card = document.querySelector(".top-result-card");
        const imgBox = card?.querySelector(".artist-image");
        const nameEl = card?.querySelector(".artist-name");
        if (imgBox)
            imgBox.style.backgroundImage = `url('${artistImgUrl || ""}')`;
        if (nameEl) nameEl.textContent = artistName || "—";
    }

    function mapToPlaylistIndex(track) {
        try {
            if (
                !window.MusicBox ||
                typeof window.MusicBox.playlist !== "function"
            )
                return -1;
            const list = window.MusicBox.playlist();
            const tNorm = normalize(track.title);
            const aNorm = normalize(track.artist);
            return list.findIndex(
                (p) =>
                    normalize(p.title) === tNorm &&
                    normalize(p.artist) === aNorm
            );
        } catch {
            return -1;
        }
    }

    function formatDuration(song) {
        // Đầu tiên thử lấy thời lượng từ đối tượng bài hát
        if (song.duration) {
            if (typeof song.duration === "number") {
                const mins = Math.floor(song.duration / 60);
                const secs = Math.floor(song.duration % 60);
                return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
            } else if (typeof song.duration === "string") {
                // Nếu đã ở định dạng MM:SS, trả về nguyên bản
                if (/^\d+:\d{2}$/.test(song.duration)) {
                    return song.duration;
                }
            }
        }

        // Nếu không có sẵn thời lượng, thử lấy từ MusicBox
        if (window.MusicBox && typeof window.MusicBox.playlist === "function") {
            try {
                const playlist = window.MusicBox.playlist();
                const foundSong = playlist.find(
                    (s) => s.title === song.title && s.artist === song.artist
                );
                if (foundSong && foundSong.duration) {
                    if (typeof foundSong.duration === "number") {
                        const mins = Math.floor(foundSong.duration / 60);
                        const secs = Math.floor(foundSong.duration % 60);
                        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
                    }
                    return foundSong.duration;
                }
            } catch (e) {
                console.error("Error getting duration from MusicBox:", e);
            }
        }

        return "0:00";
    }

    // Asynchronously ensure durations after initial render
    async function ensureDurations(songs) {
        // Try to use MusicBox playlist if ready
        let pl = [];
        try {
            if (
                window.MusicBox &&
                typeof window.MusicBox.playlist === "function"
            ) {
                pl = window.MusicBox.playlist();
            }
        } catch {}

        const byKey = new Map();
        if (Array.isArray(pl)) {
            pl.forEach((p) => {
                const key = (p.title + "\u0000" + p.artist).toLowerCase();
                byKey.set(key, p);
            });
        }

        const items = document.querySelectorAll(".top-song-item");
        songs.slice(0, 4).forEach((song, i) => {
            const row = items[i];
            if (!row) return;
            const durEl = row.querySelector(".song-duration");
            if (!durEl) return;
            // Nếu đã có dữ liệu thời lượng, bỏ qua
            if (durEl.textContent && durEl.textContent !== "0:00") return;

            const key = (
                String(song.title) +
                "\u0000" +
                String(song.artist)
            ).toLowerCase();
            const match = byKey.get(key);
            if (match && match.src) {
                const a = new Audio(match.src);
                a.addEventListener("loadedmetadata", () => {
                    const mins = Math.floor(a.duration / 60);
                    const secs = Math.floor(a.duration % 60)
                        .toString()
                        .padStart(2, "0");
                    durEl.textContent = `${mins}:${secs}`;
                });
                return;
            }

            // Dự phòng: sử dụng trực tiếp song.src nếu có
            if (song.src) {
                const a = new Audio(song.src);
                a.addEventListener("loadedmetadata", () => {
                    const mins = Math.floor(a.duration / 60);
                    const secs = Math.floor(a.duration % 60)
                        .toString()
                        .padStart(2, "0");
                    durEl.textContent = `${mins}:${secs}`;
                });
            }
        });
    }

    function renderSongs(songs) {
        console.log("Dữ liệu bài hát:", songs); // Log dữ liệu bài hát
        const container = document.querySelector(".top-songs-grid");
        if (!container) return;

        container.innerHTML = songs
            .slice(0, 4)
            .map((song, i) => {
                // Lưu dữ liệu bài hát vào phần tử
                const duration = formatDuration(song);
                console.log(`Bài hát ${i}:`, song.title, "Thời lượng:", song.duration, "Định dạng:", duration);

                return `
                <div class="top-song-item" data-song='${JSON.stringify(song)}'>
                    <div class="song-number">${i + 1}</div>
                    <div class="song-cover" style="background-image: url('${
                        song.cover || "./assets/imgs/album-cover-1.jpg"
                    }')"></div>
                    <div class="song-details">
                        <div class="song-title">${
                            song.title || "Unknown Song"
                        }</div>
                        <div class="song-artist">${
                            song.artist || "Unknown Artist"
                        }</div>
                    </div>
                    <div class="song-duration">${duration}</div>
                </div>`;
            })
            .join("");

        // Cập nhật thời lượng sau khi render
        ensureDurations(songs);

        // Add click event listeners to song items
        document.querySelectorAll(".top-song-item").forEach((item) => {
            item.style.cursor = "pointer";
            item.addEventListener("click", (e) => {
                try {
                    const songData = JSON.parse(item.getAttribute("data-song"));
                    if (!songData) {
                        console.error("No song data found");
                        return;
                    }
                    
                    // Tìm trong danh sách phát
                    const playlist = window.MusicBox ? window.MusicBox.playlist() : [];
                    console.log("Danh sách phát:", playlist); // Log danh sách phát
                    console.log("Dữ liệu bài hát:", songData); // Log dữ liệu bài hát
                    
                    const playlistIndex = playlist.findIndex(
                        (p) => p.id === songData.id || 
                               (p.title === songData.title && p.artist === songData.artist)
                    );
                    
                    console.log("Vị trí trong playlist:", playlistIndex);
                    
                    if (
                        playlistIndex >= 0 &&
                        window.MusicBox &&
                        typeof window.MusicBox.playAt === "function"
                    ) {
                        console.log("Đang phát bài hát tại vị trí:", playlistIndex);
                        window.MusicBox.playAt(playlistIndex);
                    } else {
                        console.error("Không thể phát bài hát. MusicBox khả dụng:", !!window.MusicBox, 
                                      "Vị trí trong playlist:", playlistIndex);
                    }
                } catch (error) {
                    console.error("Lỗi khi phát bài hát:", error);
                }
            });
        });
    }

    function renderAlbums(artistName) {
        const container = document.querySelector(".songs-grid");
        if (!container) return;

        // Lấy album của nghệ sĩ
        let albums = [];
        if (
            window.MusicBoxAlbums &&
            typeof window.MusicBoxAlbums.getAlbumsForArtist === "function"
        ) {
            albums = window.MusicBoxAlbums.getAlbumsForArtist(artistName);
        }

        // Không có album nào
        if (!albums.length) {
            console.warn(`No albums found for artist: ${artistName}`);
            return;
        }

        // Hiển thị album
        container.innerHTML = albums
            .map(
                (album, index) => `
            <div class="song-item">
                <div class="song-cover" style="background-image: url('${album.image}')"></div>
                <div class="song-info">
                    <div class="song-name">${album.name}</div>
                    <div class="song-artist">${album.artist}</div>
                </div>
            </div>
        `
            )
            .join("");

        // Xử lý click vào album
        document.querySelectorAll(".song-item").forEach((item, index) => {
            item.style.cursor = "pointer";
            item.addEventListener("click", () => {
                // Phát bài đầu tiên của nghệ sĩ
                if (
                    window.MusicBox &&
                    typeof window.MusicBox.playlist === "function"
                ) {
                    const playlist = window.MusicBox.playlist();
                    const artistSongs = playlist.filter(
                        (song) =>
                            normalize(song.artist) === normalize(artistName)
                    );

                    if (artistSongs.length > 0) {
                        const firstSongIndex = playlist.findIndex(
                            (song) =>
                                song.title === artistSongs[0].title &&
                                song.artist === artistSongs[0].artist
                        );

                        if (
                            firstSongIndex >= 0 &&
                            typeof window.MusicBox.playAt === "function"
                        ) {
                            window.MusicBox.playAt(firstSongIndex);
                        }
                    }
                }
            });
        });
    }

    async function start() {
        const rawQ = getQuery();
        const qNorm = normalize(rawQ);

        const input = document.querySelector('.search input[type="search"]');
        if (input) input.value = rawQ;

        const all = await getAllSongs();
        if (!all.length) return;
        const artistSet = Array.from(new Set(all.map((s) => s.artist)));
        const pickedArtist = pickArtist(artistSet, qNorm);
        const artistSongs = all
            .filter((s) => normalize(s.artist) === normalize(pickedArtist))
            .slice(0, 12);
        const artistImg =
            artistSongs[0]?.artistImg || artistSongs[0]?.cover || "";

        renderArtistHeader(pickedArtist, artistImg);
        renderSongs(artistSongs);
        renderAlbums(pickedArtist);
        
        // Chờ MusicBox khả dụng trước khi thêm sự kiện click
        if (!window.MusicBox) {
            // Kiểm tra định kỳ xem MusicBox đã khả dụng chưa
            const checkInterval = setInterval(() => {
                if (window.MusicBox) {
                    clearInterval(checkInterval);
                    // Tải lại danh sách bài hát để gắn sự kiện click chính xác
                    renderSongs(artistSongs);
                }
            }, 100);
            
            // Dừng kiểm tra sau 10 giây
            setTimeout(() => clearInterval(checkInterval), 10000);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();

// Ẩn .main-content khi có .queue hiển thị trên trang (sửa lỗi)
(function () {
    const SEARCH_SEL = ".timkiem-main";
    const QUEUE_SEL = ".queue";
    const HIDE_CLASS = "is-hidden";

    // Thêm CSS ẩn nếu chưa tồn tại
    (function ensureHideClass() {
        if (document.getElementById("hide-timkiem-style")) return;
        const style = document.createElement("style");
        style.id = "hide-timkiem-style";
        style.textContent = `.${HIDE_CLASS}{ display:none !important; }`;
        document.head.appendChild(style);
    })();

    // Helper: kiểm tra phần tử có "đang hiển thị" không
    function isVisible(el) {
        if (!el || el.hidden) return false;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // Đồng bộ ẩn/hiện
    function sync() {
        const searchEl = document.querySelector(SEARCH_SEL);
        if (!searchEl) return;
        const queues = Array.from(document.querySelectorAll(QUEUE_SEL));
        const anyQueueVisible = queues.some(isVisible);
        searchEl.classList.toggle(HIDE_CLASS, anyQueueVisible);
    }

    // Tối ưu hiệu năng với requestAnimationFrame
    let rafId = 0;
    const scheduleSync = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            sync();
        });
    };

    // Khởi tạo và theo dõi thay đổi
    function start() {
        sync();
        new MutationObserver(scheduleSync).observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "hidden"],
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();

// Xử lý nút theo dõi cho nghệ sĩ trong trang tìm kiếm
(function setupFollowButtonForArtist() {
    function normalize(s) {
        return (s || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function getFollowedArtists() {
        try {
            const data = localStorage.getItem("followedArtists");
            return data ? new Set(JSON.parse(data)) : new Set();
        } catch {
            return new Set();
        }
    }

    function saveFollowedArtists(set) {
        try {
            localStorage.setItem("followedArtists", JSON.stringify([...set]));
        } catch (e) {
            console.error("Failed to save followed artists:", e);
        }
    }

    function updateFollowUI(button, artistName) {
        const set = getFollowedArtists();
        const key = normalize(artistName);
        const isFollowing = !!(key && set.has(key));

        button.classList.toggle("is-following", isFollowing);
        button.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
        button.setAttribute("aria-pressed", String(isFollowing));
    }

    function toggleFollow(button, artistName) {
        try {
            const key = normalize(artistName);
            if (!key) return;

            const set = getFollowedArtists();
            if (set.has(key)) {
                set.delete(key);
            } else {
                set.add(key);
            }

            saveFollowedArtists(set);
            updateFollowUI(button, artistName);

            // Đồng bộ trạng thái với nút kia trên trang
            syncBothButtons(artistName);
        } catch (e) {
            console.error("Error toggling follow:", e);
        }
    }

    function syncBothButtons(artistName) {
        const set = getFollowedArtists();
        const key = normalize(artistName);
        const isFollowing = !!(key && set.has(key));

        // Cập nhật cả hai nút
        const followButton = document.querySelector("#follow-button");
        const bFollow = document.querySelector("#b-follow");

        if (followButton) {
            followButton.classList.toggle("is-following", isFollowing);
            followButton.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
            followButton.setAttribute("aria-pressed", String(isFollowing));
        }

        if (bFollow) {
            bFollow.classList.toggle("is-following", isFollowing);
            bFollow.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
            bFollow.setAttribute("aria-pressed", String(isFollowing));
        }
    }

    function init() {
        const followButton = document.querySelector("#follow-button");
        const bFollow = document.querySelector("#b-follow");
        const artistNameEl = document.querySelector(".artist-name");
        const artistName = artistNameEl ? artistNameEl.textContent.trim() : "";

        if (!artistName) return;

        // Cập nhật UI ban đầu cho cả hai nút
        syncBothButtons(artistName);

        // Thêm sự kiện click cho cả hai nút
        if (followButton) {
            followButton.addEventListener("click", () => {
                toggleFollow(followButton, artistName);
            });
        }

        if (bFollow) {
            bFollow.addEventListener("click", () => {
                toggleFollow(bFollow, artistName);
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();