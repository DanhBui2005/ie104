// -------- 2. HERO CAROUSEL AUTO SLIDE --------
const hero = document.getElementById("hero-carousel");
const banners = hero ? hero.querySelectorAll(".q-banner") : [];
const dots = hero ? hero.querySelectorAll(".hero-dot") : [];
let currentIndex = 0;

function showBanner(index) {
    banners.forEach((b, i) => {
        b.classList.toggle("hidden", i !== index);
        dots[i].classList.toggle("is-active", i === index);
    });
}

function nextBanner() {
    currentIndex = (currentIndex + 1) % banners.length;
    showBanner(currentIndex);
}

if (banners.length > 0) {
    showBanner(0);
    setInterval(nextBanner, 5000);

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            currentIndex = i;
            showBanner(i);
        });
    });
}

// -------- 3. PLAY BUTTON INTERACTION (Mock) --------
function setupPlayButtons() {
    const scope = document;
    const buttons = scope.querySelectorAll(
        ".playlist-play, .album-play, .track-play-btn"
    );
    buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const card =
                btn.closest(".playlist-card") ||
                btn.closest(".album-card") ||
                btn.closest(".track-row");
            const title =
                card?.querySelector(
                    ".playlist-title, .album-title, .track-title"
                )?.textContent || "Bài hát";
            alert(`🎵 Đang phát: ${title}`);
        });
    });
}

document.addEventListener("DOMContentLoaded", setupPlayButtons);
function syncRangeFills() {
    const progress = document.getElementById("progress");
    const volume = document.getElementById("volume");
    if (progress) {
        const updateProgress = () => {
            const min = Number(progress.min || 0);
            const max = Number(progress.max || 100);
            const val = Number(progress.value || 0);
            const pct = ((val - min) * 100) / (max - min);
            progress.style.setProperty("--progress-value", pct + "%");
        };
        progress.addEventListener("input", updateProgress);
        updateProgress();
    }
    if (volume) {
    const updateVolume = () => {
        const min = Number(volume.min || 0);
        const max = Number(volume.max || 1);
        const val = Number(volume.value || 0);
        const pct = ((val - min) * 100) / (max - min);
        volume.style.setProperty("--volume-value", pct + "%");

        // Update volume icon if the global function is available
        const volIcon = document.getElementById("vol-icon");
        if (volIcon && window.__mbUpdateVolumeIcon) {
            window.__mbUpdateVolumeIcon(val);
        }
    };
    volume.addEventListener("input", updateVolume);
    updateVolume();
}

}

document.addEventListener("DOMContentLoaded", syncRangeFills);

// ---------- SLIDER CONTROLS ----------
function setupSliders() {
    const sliders = document.querySelectorAll(".slider");
    sliders.forEach((slider) => {
        const track = slider.querySelector(".slider-track");
        const prev = slider.querySelector(".slider-btn.prev");
        const next = slider.querySelector(".slider-btn.next");
        if (!track) return;

        const scrollAmount = () => Math.max(300, track.clientWidth * 0.8);

        if (prev)
            prev.addEventListener("click", () =>
                track.scrollBy({ left: -scrollAmount(), behavior: "smooth" })
            );
        if (next)
            next.addEventListener("click", () =>
                track.scrollBy({ left: scrollAmount(), behavior: "smooth" })
            );

        // Only handle horizontal wheel scroll (left/right on trackpad)
        // Vertical scroll (up/down) is ignored to allow normal page scrolling
        track.addEventListener(
            "wheel",
            (e) => {
                // Only handle horizontal scroll (deltaX)
                if (Math.abs(e.deltaX) > 2) {
                    e.preventDefault();
                    track.scrollBy({ left: e.deltaX, behavior: "auto" });
                }
                // If only vertical scroll (deltaY), let it pass through for normal page scrolling
            },
            { passive: false }
        );
    });
}

document.addEventListener("DOMContentLoaded", setupSliders);

// -------- 4. PLAYLIST CARD CLICK HANDLER - TÁI SỬ DỤNG -------- Thêm bởi: Khôi
// Hàm chung để xử lý click và phát nhạc cho các playlist-card có data-song-id
function handlePlaylistCardClick(songId) {
    // Kiểm tra nếu đang phát quảng cáo
    if (window.__mbIsAdPlaying && window.__mbIsAdPlaying()) {
        return;
    }

    try {
        // Lấy allSongs
        const allSongs = window.__mbAllSongs || [];

        // Tìm bài hát trong allSongs
        const song = allSongs.find((s) => s.id === songId);
        if (!song) {
            console.warn("Không tìm thấy bài hát với ID:", songId);
            return;
        }

        // Lấy playlist hiện tại
        const currentPlaylist = window.__mbPlaylist || [];

        // Tìm index của bài hát trong playlist hiện tại
        let songIndex = currentPlaylist.findIndex((s) => s && s.id === songId);

        // Nếu chưa có trong playlist, thêm vào
        if (songIndex === -1) {
            if (window.__mbSetPlaylist) {
                // Thêm bài hát vào đầu playlist
                const newPlaylist = [song, ...currentPlaylist];
                window.__mbSetPlaylist(newPlaylist);
                songIndex = 0;
            } else {
                // Fallback: thêm trực tiếp vào window.__mbPlaylist
                window.__mbPlaylist = [song, ...currentPlaylist];
                songIndex = 0;
            }
        }

        // Phát nhạc
        if (window.MusicBox && typeof window.MusicBox.playAt === "function") {
            window.MusicBox.playAt(songIndex);

            // Cập nhật queue nếu có hàm render
            if (window.__mbRenderQueue) {
                window.__mbRenderQueue();
            }
        }
    } catch (error) {
        console.error("Lỗi khi phát nhạc:", error);
    }
}

// Hàm setup cho các slider có playlist-card với data-song-id
function setupPlaylistCardSliders() {
    // Chờ MusicBox sẵn sàng
    function waitForMusicBox(callback, maxAttempts = 50) {
        if (
            window.MusicBox &&
            typeof window.MusicBox.playAt === "function" &&
            window.__mbAllSongs
        ) {
            callback();
        } else if (maxAttempts > 0) {
            setTimeout(() => waitForMusicBox(callback, maxAttempts - 1), 100);
        }
    }

    waitForMusicBox(() => {
        // Tìm tất cả các section có playlist-card với data-song-id
        const sections = document.querySelectorAll(".home-section");

        sections.forEach((section) => {
            const cards = section.querySelectorAll(
                ".playlist-card[data-song-id]"
            );

            cards.forEach((card) => {
                card.style.cursor = "pointer";
                card.addEventListener("click", (e) => {
                    // Ngăn chặn event bubble nếu có button bên trong
                    if (e.target.closest(".slider-btn")) return;

                    const songId = card.getAttribute("data-song-id");
                    if (!songId) return;

                    handlePlaylistCardClick(songId);
                });
            });
        });
    });
}

// Chờ DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPlaylistCardSliders);
} else {
    setupPlaylistCardSliders();
}

// -------- 5. ARTIST CARD CLICK HANDLER - NAVIGATE TO ARTIST PAGE -------- Thêm bởi: Khôi
// Xử lý click vào artist-card để điều hướng đến trang tìm kiếm nghệ sĩ
function setupArtistCardNavigation() {
    // Chờ hàm go sẵn sàng
    function waitForGo(callback, maxAttempts = 50) {
        if (window.__mbGo && typeof window.__mbGo === "function") {
            callback();
        } else if (maxAttempts > 0) {
            setTimeout(() => waitForGo(callback, maxAttempts - 1), 100);
        }
    }

    waitForGo(() => {
        const bestArtistsSection = document.querySelector(".home-best-artists");
        if (!bestArtistsSection) return;

        // Chỉ lấy các artist-card mới thêm (có ảnh từ imgs_casi)
        const artistCards = bestArtistsSection.querySelectorAll(".artist-card");

        artistCards.forEach((card) => {
            const img = card.querySelector(".artist-avatar");
            if (!img) return;

            const imgSrc = img.getAttribute("src") || "";
            // Chỉ xử lý các card có ảnh từ imgs_casi (nghệ sĩ mới thêm)
            if (imgSrc.includes("imgs_casi")) {
                card.style.cursor = "pointer";
                card.addEventListener("click", (e) => {
                    // Ngăn chặn event bubble nếu có button bên trong
                    if (e.target.closest(".slider-btn")) return;

                    const artistName = card
                        .querySelector(".artist-name")
                        ?.textContent?.trim();
                    if (!artistName) return;

                    // Điều hướng đến trang tìm kiếm với tên nghệ sĩ
                    const searchUrl = `./timkiem.html?q=${encodeURIComponent(
                        artistName
                    )}`;
                    if (window.__mbGo) {
                        window.__mbGo(searchUrl);
                    } else {
                        // Fallback: dùng window.location
                        window.location.href = searchUrl;
                    }
                });
            }
        });
    });
}

// Chờ DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupArtistCardNavigation);
} else {
    setupArtistCardNavigation();
}
