// ===== ĐIỂM KHỞI TẠO ỨNG DỤNG CHÍNH =====
// Import các module cần thiết cho ứng dụng
import { gate, signOut } from "./app/auth.js";  // Xác thực và đăng xuất
import {
    initPlaylists,         // Khởi tạo playlist
    loadPlaylistFromJSON,   // Tải playlist từ file JSON
    renderQueue,            // Hiển thị hàng chờ phát nhạc
    updateQueueActive,      // Cập nhật trạng thái hàng chờ
    setPlaylist,            // Đặt playlist hiện tại
    getPlaylist,            // Lấy playlist hiện tại
    getUserPlaylists,       // Lấy playlist của người dùng
    getLikedList,           // Lấy danh sách bài hát thích
    setLikedList,           // Lưu danh sách bài hát thích
    isLiked,                // Kiểm tra bài hát đã thích chưa
    getFollowedArtists,     // Lấy danh sách nghệ sĩ theo dõi
    saveFollowedArtists,    // Lưu danh sách nghệ sĩ theo dõi
} from "./app/playlists.js";
import { initPlayer } from "./app/player.js";  // Khởi tạo trình phát nhạc
import { initUI } from "./app/ui.js";          // Khởi tạo giao diện người dùng
import DarkModeManager from "./darkmode.js";    // Quản lý chế độ tối

// ===== HẰNG SỐ =====
const DEFAULT_PLAYLIST_COVER =
    "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg";  // Ảnh bìa mặc định cho playlist
const TRUNCATE_LENGTH = 40;      // Độ dài tối đa của chuỗi trước khi cắt
const TRUNCATE_PREVIEW = 37;     // Độ dài hiển thị khi cắt chuỗi
const DEFAULT_PLAYLIST_NAME = "Playlist";  // Tên playlist mặc định
const DEFAULT_TRACK_COUNT = 0;    // Số lượng bài hát mặc định

// ===== CÁC HÀM HỖ TRỢ =====
/**
 * Cắt chuỗi đến độ dài tối đa và thêm dấu ba chấm
 * @param {string} str - Chuỗi cần cắt
 * @returns {string} Chuỗi đã được cắt
 */
function truncateText(str) {
    const text = String(str || "");
    if (text.length <= TRUNCATE_LENGTH) return text;
    return text.slice(0, TRUNCATE_PREVIEW) + "...";
}

/**
 * Thiết lập kiểu ảnh nền cho phần tử bìa
 * @param {HTMLElement} element - Phần tử cần thiết lập kiểu
 * @param {string} imageUrl - URL của ảnh
 */
function setCoverImage(element, imageUrl) {
    if (!element) return;
    element.style.backgroundImage = `url('${
        imageUrl || DEFAULT_PLAYLIST_COVER
    }')`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
}

/**
 * Điều hướng đến trang playlist với xử lý lỗi
 * @param {Object} uiContext - Ngữ cảnh UI chứa phương thức điều hướng
 * @param {string} playlistId - ID của playlist cần điều hướng đến
 */
function navigateToPlaylist(uiContext, playlistId) {
    try {
        uiContext.go(`./playlist.html?id=${encodeURIComponent(playlistId)}`);
    } catch (error) {
        console.warn(
            "Navigation via uiContext failed, using window.location:",
            error
        );
        window.location.href = `./playlist.html?id=${encodeURIComponent(
            playlistId
        )}`;
    }
}

/**
 * Thực thi hàm một cách an toàn với xử lý lỗi
 * @param {Function} fn - Hàm cần thực thi
 * @param {string} context - Mô tả ngữ cảnh cho việc ghi log lỗi
 */
function safeExecute(fn, context = "operation") {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        return null;
    }
}

// ===== KHỞI TẠO ỨNG DỤNG =====
// Khởi tạo chế độ tối (chỉ một lần)
if (!window.darkModeManager) {
    window.darkModeManager = new DarkModeManager();
}

// Chạy cổng xác thực để kiểm tra đăng nhập
gate();

// Khi tài liệu HTML đã tải xong
document.addEventListener("DOMContentLoaded", async () => {
    // Khởi tạo module playlist
    const playlistContext = initPlaylists();

    // Tải dữ liệu playlist từ file JSON
    const playlistData = await loadPlaylistFromJSON();

    // Lưu trữ dữ liệu playlist toàn cầu để các module khác có thể truy cập
    window.__mbPlaylist = playlistData.playlist;              // Playlist hiện tại
    window.__mbAllSongs = playlistData.allSongs;               // Tất cả bài hát
    window.__mbCurrentPlaylistCtx = playlistData.currentPlaylistCtx; // Ngữ cảnh playlist hiện tại

    // Khởi tạo module trình phát nhạc
    const playerContext = initPlayer();

    // Lưu trữ các hàm của trình phát nhạc toàn cầu để giao tiếp giữa các module
    window.__mbSavePlayerState = playerContext.savePlayerState;     // Lưu trạng thái trình phát
    window.__mbGetCurrentIndex = playerContext.getCurrentIndex;     // Lấy chỉ số bài hát hiện tại
    window.__mbUpdateVolumeSlider = playerContext.updateVolumeSlider; // Cập nhật thanh âm lượng
    window.__mbUpdateVolumeIcon = playerContext.updateVolumeIcon;     // Cập nhật biểu tượng âm lượng

    // Thiết lập các hàm playlist cho trình phát nhạc
    window.__mbSetPlaylist = setPlaylist;  // Đặt playlist hiện tại
    
    // Hàm hiển thị hàng chờ phát nhạc
    window.__mbRenderQueue = () => {
        const queueListEl = document.getElementById("queue-list");
        renderQueue(queueListEl, (index) => {
            // Nếu đang phát quảng cáo thì không làm gì
            if (window.__mbIsAdPlaying && window.__mbIsAdPlaying()) return;
            // Tải và phát bài hát được chọn
            playerContext.loadTrack(index);
            playerContext.play();
            // Cập nhật trạng thái UI
            if (window.__mbPushUIState) window.__mbPushUIState();
            playerContext.savePlayerState(true);
        });
    };
    window.__mbUpdateQueueActive = updateQueueActive;  // Cập nhật trạng thái hàng chờ

    // Hiển thị hàng chờ lần đầu tiên
    window.__mbRenderQueue();

    // Thử khôi phục trạng thái trình phát hoặc tải bài hát đầu tiên
    initializePlayerState(playerContext);

    // Khởi tạo module UI
    const uiContext = initUI({
        signOut,           // Hàm đăng xuất
        playlistContext,   // Ngữ cảnh playlist
        playerContext,     // Ngữ cảnh trình phát nhạc
    });

    // Thiết lập các tính năng UI bổ sung yêu cầu tất cả các module đã được tải
    setupAdditionalFeatures(playlistContext, playerContext, uiContext);
});

/**
 * Khởi tạo trạng thái trình phát nhạc khi tải lần đầu
 * @param {Object} playerContext - Ngữ cảnh trình phát nhạc
 */
function initializePlayerState(playerContext) {
    // Thử khôi phục trạng thái trình phát, nếu thành công thì return
    if (playerContext.restorePlayerState()) return;

    // Nếu không, tải bài hát đầu tiên
    playerContext.loadTrack(0);
    const audio = playerContext.getAudio();

    // Thiết lập âm lượng từ thanh trượt
    const volumeSlider = document.getElementById("volume");
    if (volumeSlider) {
        audio.volume = Number(volumeSlider.value);
        volumeSlider.setAttribute("aria-valuenow", String(audio.volume));
    }

    // Thiết lập thanh tiến trình về 0
    const progressBar = document.getElementById("progress");
    if (progressBar) {
        progressBar.setAttribute("aria-valuenow", "0");
    }

    // Đặt UI phát ban đầu thành trạng thái tạm dừng
    const playIcon = document.getElementById("play-icon");
    if (playIcon) {
        playIcon.classList.add("fa-play");
        playIcon.classList.remove("fa-pause");
    }

    // Cập nhật các điều khiển âm lượng một cách an toàn
    safeExecute(() => {
        playerContext.updateVolumeSlider();
        playerContext.updateVolumeIcon(audio.volume);
    }, "updateVolumeControls");
}

// ===== THIẾT LẬP CÁC TÍNH NĂNG BỔ SUNG =====
function setupAdditionalFeatures(playlistContext, playerContext, uiContext) {
    setupProfilePlaylists(uiContext);    // Thiết lập playlist trên trang hồ sơ
    setupSidebarPlaylists(uiContext);    // Thiết lập playlist ở thanh bên
    setupLikeButton(playerContext);      // Thiết lập nút thích
    setupFollowButton(playlistContext, playerContext); // Thiết lập nút theo dõi nghệ sĩ
}

/**
 * Thiết lập đồng bộ hóa playlist trên trang hồ sơ
 * @param {Object} uiContext - Ngữ cảnh UI
 */
function setupProfilePlaylists(uiContext) {
    function syncProfilePlaylists() {
        return safeExecute(() => {
            const wrap = document.querySelector(".my-playlists");
            if (!wrap) return; // Không phải trang hồ sơ

            const lists = getUserPlaylists(); // Lấy danh sách playlist của người dùng

            // Cập nhật số lượng trong tiêu đề phần
            const titleEl = Array.from(
                document.querySelectorAll(".section-title")
            ).find((el) => /Playlist\s+đã\s+tạo/i.test(el.textContent));

            if (titleEl) {
                titleEl.textContent = `Playlist đã tạo (${lists.length})`;
            }

            // Đảm bảo có đủ thẻ; tái sử dụng các thẻ hiện có
            let cards = Array.from(wrap.querySelectorAll(".my-pl-card"));

            // Tạo thẻ còn thiếu nếu cần
            while (cards.length < lists.length) {
                const card = document.createElement("div");
                card.className = "my-pl-card";
                card.innerHTML = `
                    <div class="my-pl-cover"></div>
                    <div class="my-pl-name"></div>
                    <div class="my-pl-sub"></div>
                `;
                wrap.appendChild(card);
                cards.push(card);
            }

            // Cập nhật thẻ với dữ liệu playlist
            cards.forEach((card, i) => {
                const pl = lists[i];
                if (!pl) {
                    card.style.display = "none";
                    return;
                }

                card.style.display = "";
                card.dataset.plId = pl.id;

                const cover = card.querySelector(".my-pl-cover");
                setCoverImage(cover, pl.cover);

                const name = card.querySelector(".my-pl-name");
                if (name) {
                    name.textContent = truncateText(
                        pl.name || DEFAULT_PLAYLIST_NAME
                    );
                }

                const sub = card.querySelector(".my-pl-sub");
                if (sub) {
                    const trackCount = Array.isArray(pl.tracks)
                        ? pl.tracks.length
                        : DEFAULT_TRACK_COUNT;
                    sub.textContent = `${trackCount} bài hát`;
                }

                // Gán sự kiện click để điều hướng
                card.onclick = () => navigateToPlaylist(uiContext, pl.id);
            });
        }, "syncProfilePlaylists");
    }

    // Đồng bộ hóa playlist lần đầu và lắng nghe thay đổi
    syncProfilePlaylists();
    window.addEventListener("playlists:changed", syncProfilePlaylists);
}

/**
 * Thiết lập hiển thị playlist ở thanh bên
 * @param {Object} uiContext - Ngữ cảnh UI
 */
function setupSidebarPlaylists(uiContext) {
    function renderSidebarPlaylists() {
        return safeExecute(() => {
            const container = document.querySelector(".pl-list");
            if (!container) return;

            const lists = getUserPlaylists(); // Lấy danh sách playlist của người dùng
            container.innerHTML = ""; // Xóa nội dung hiện tại

            // Tạo từng mục playlist
            lists.forEach((pl) => {
                const row = document.createElement("div");
                row.className = "pl-item";
                row.dataset.plId = pl.id;
                row.innerHTML = `
                    <div class="pl-cover"></div>
                    <div class="pl-meta">
                        <div class="pl-name">${truncateText(
                            pl.name || DEFAULT_PLAYLIST_NAME
                        )}</div>
                        <div class="pl-sub">Playlist • ${
                            pl.tracks?.length || DEFAULT_TRACK_COUNT
                        } songs</div>
                    </div>
                `;

                const cover = row.querySelector(".pl-cover");
                setCoverImage(cover, pl.cover);

                // Thêm sự kiện click để điều hướng đến playlist
                row.addEventListener("click", () =>
                    navigateToPlaylist(uiContext, pl.id)
                );
                container.appendChild(row);
            });
        }, "renderSidebarPlaylists");
    }

    // Hiển thị playlist lần đầu và lắng nghe thay đổi
    renderSidebarPlaylists();
    window.addEventListener("playlists:changed", renderSidebarPlaylists);
}

/**
 * Thiết lập chức năng nút thích
 * @param {Object} playerContext - Ngữ cảnh trình phát nhạc
 */
function setupLikeButton(playerContext) {
    const likeBtn = document.getElementById("like");
    if (!likeBtn) return;

    // Cập nhật giao diện nút thích
    function updateLikeUI() {
        const icon = likeBtn.querySelector("i");
        if (!icon) return;

        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const currentTrack = playlist[index] || {};
        const liked = isLiked(currentTrack.id); // Kiểm tra bài hát đã được thích chưa

        // Thay đổi biểu tượng dựa trên trạng thái thích
        icon.classList.toggle("fa-solid", !!liked);  // Đã thích: biểu tượng đặc
        icon.classList.toggle("fa-regular", !liked); // Chưa thích: biểu tượng rỗng
        icon.classList.add("fa-heart");
        likeBtn.classList.toggle("active", !!liked); // Thêm class active nếu đã thích
    }

    // Chuyển đổi trạng thái thích của bài hát hiện tại
    function toggleLikeCurrent() {
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const currentTrack = playlist[index];

        if (!currentTrack) return;

        let list = getLikedList(); // Lấy danh sách bài hát thích
        // Kiểm tra bài hát đã có trong danh sách thích chưa
        const exists =
            currentTrack.id && Array.isArray(list)
                ? list.findIndex((x) => x && x.id === currentTrack.id)
                : -1;

        if (exists >= 0) {
            // Nếu đã thích, xóa khỏi danh sách
            list.splice(exists, 1);
        } else {
            // Nếu chưa thích, thêm vào danh sách
            const durationEl = document.getElementById("duration");
            const item = {
                id:
                    currentTrack.id ||
                    currentTrack.src ||
                    `${currentTrack.title}|${currentTrack.artist}`,
                title: currentTrack.title || "—",
                artist: currentTrack.artist || "—",
                cover: currentTrack.cover || "",
                duration: durationEl?.textContent || "--:--",
            };

            // Loại bỏ trùng lặp theo id
            list = Array.isArray(list)
                ? list.filter((x) => x && x.id !== item.id)
                : [];
            list.push(item);
        }

        setLikedList(list); // Lưu danh sách thích
        updateLikeUI();      // Cập nhật giao diện
    }

    // Gán sự kiện và lắng nghe thay đổi
    likeBtn.addEventListener("click", toggleLikeCurrent);
    window.addEventListener("liked:changed", updateLikeUI);
    window.addEventListener("musicbox:trackchange", updateLikeUI);
    updateLikeUI(); // Cập nhật UI lần đầu
}

/**
 * Thiết lập chức năng nút theo dõi nghệ sĩ
 * @param {Object} playlistContext - Ngữ cảnh playlist
 * @param {Object} playerContext - Ngữ cảnh trình phát nhạc
 */
function setupFollowButton(playlistContext, playerContext) {
    const bFollow = document.getElementById("b-follow");
    if (!bFollow) return;

    // Cập nhật giao diện nút theo dõi
    function updateFollowUI(artistName) {
        const set = getFollowedArtists(); // Lấy danh sách nghệ sĩ theo dõi
        const key = playlistContext.normArtist(artistName); // Chuẩn hóa tên nghệ sĩ
        const isFollowing = !!(key && set.has(key)); // Kiểm tra đang theo dõi chưa

        // Cập nhật giao diện nút
        bFollow.classList.toggle("is-following", isFollowing);
        bFollow.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
        bFollow.setAttribute("aria-pressed", String(isFollowing));
    }

    // Chuyển đổi trạng thái theo dõi
    function toggleFollow() {
        return safeExecute(() => {
            const playlist = getPlaylist();
            const index = playerContext.getCurrentIndex();
            const track = playlist[index] || {};
            const key = playlistContext.normArtist(track.artist || "");

            if (!key) return;

            const set = getFollowedArtists();
            if (set.has(key)) {
                // Nếu đang theo dõi, hủy theo dõi
                set.delete(key);
            } else {
                // Nếu chưa theo dõi, thêm vào danh sách
                set.add(key);
            }

            saveFollowedArtists(set); // Lưu danh sách nghệ sĩ theo dõi
            updateFollowUI(track.artist || ""); // Cập nhật giao diện
        }, "toggleFollow");
    }

    // Gán sự kiện và lắng nghe thay đổi
    bFollow.addEventListener("click", toggleFollow);

    // Cập nhật giao diện theo dõi khi bài hát thay đổi
    window.addEventListener("musicbox:trackchange", () => {
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const track = playlist[index] || {};
        updateFollowUI(track.artist);
    });
}
