// ===== MODULE TRANG PLAYLIST =====

// ===== HẰNG SỐ =====
const STORAGE_KEYS = {
    USER_PLAYLISTS: "user_playlists_v1", // Lưu trữ playlist người dùng
    PLAYER_STATE: "player_state_v1",     // Lưu trữ trạng thái player
};

const SONGS_JSON_PATH = "./assets/music_data/songs.json"; // Đường dẫn file dữ liệu bài hát
const PLAYLIST_TYPES = {
    USER: "user", // Loại playlist người dùng
};

const DEFAULT_PLAYLIST_NAME = "Playlist"; // Tên mặc định cho playlist
const DEFAULT_TIME_DISPLAY = "--:--";    // Hiển thị thời gian mặc định

// ===== HÀM TIỆN ÍCH =====
/**
 * Thực thi hàm một cách an toàn với xử lý lỗi
 * @param {Function} fn - Hàm cần thực thi
 * @param {string} context - Mô tả ngữ cảnh cho ghi log lỗi
 * @returns {*} Kết quả hàm hoặc null nếu có lỗi
 */
function safeExecute(fn, context = "operation") {
    try {
        return fn();
    } catch (error) {
        console.error(`Lỗi trong ${context}:`, error);
        return null;
    }
}

/**
 * Trình chọn CSS helper
 * @param {string} selector - Bộ chọn CSS
 * @param {Document|Element} root - Phần tử gốc để tìm kiếm
 * @returns {HTMLElement|null} Phần tử tìm thấy hoặc null
 */
function querySelector(selector, root = document) {
    return root.querySelector(selector);
}

/**
 * Trình chọn tất cả CSS helper
 * @param {string} selector - Bộ chọn CSS
 * @param {Document|Element} root - Phần tử gốc để tìm kiếm
 * @returns {Array<HTMLElement>} Mảng các phần tử tìm thấy
 */
function querySelectorAll(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

/**
 * Lấy giá trị tham số URL
 * @param {string} name - Tên tham số
 * @returns {string} Giá trị tham số hoặc chuỗi rỗng
 */
function getUrlParam(name) {
    return safeExecute(() => {
        return new URL(location.href).searchParams.get(name) || "";
    }, "getUrlParam") ?? "";
}

/**
 * Định dạng giây thành định dạng MM:SS
 * @param {number} seconds - Thời gian tính bằng giây
 * @returns {string} Chuỗi thời gian đã định dạng
 */
function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
}

/**
 * Lấy danh sách playlist người dùng từ localStorage
 * @returns {Array} Mảng playlist người dùng
 */
function getUserPlaylists() {
    return safeExecute(() => {
        return JSON.parse(
            localStorage.getItem(STORAGE_KEYS.USER_PLAYLISTS) || "[]"
        );
    }, "getUserPlaylists") ?? [];
}

/**
 * Lấy các bài hát đã lưu trữ từ window
 * @returns {Array} Mảng các bài hát
 */
function getCachedSongs() {
    return safeExecute(() => {
        return window.__allSongs || [];
    }, "getCachedSongs") ?? [];
}

/**
 * Đặt các bài hát đã lưu trữ vào window
 * @param {Array} songs - Mảng các bài hát
 */
function setCachedSongs(songs) {
    safeExecute(() => {
        window.__allSongs = songs;
    }, "setCachedSongs");
}

/**
 * Tải tất cả bài hát từ file JSON
 * @returns {Promise<Array>} Mảng các bài hát
 */
async function loadAllSongs() {
    const cached = getCachedSongs();
    if (cached.length > 0) {
        return cached;
    }

    try {
        const response = await fetch(SONGS_JSON_PATH, {
            cache: "no-store",
        });
        const data = await response.json();
        if (Array.isArray(data)) {
            setCachedSongs(data);
            return data;
        }
    } catch (error) {
        console.error("Không thể tải songs.json:", error);
    }
    return [];
}

/**
 * Tạo bản đồ các mục theo ID
 * @param {Array} items - Mảng các mục có thuộc tính id
 * @returns {Map} Bản đồ id tới mục
 */
function createIdMap(items) {
    const map = new Map();
    items.forEach((item) => {
        if (item?.id) {
            map.set(item.id, item);
        }
    });
    return map;
}

/**
 * Lưu playlist người dùng vào localStorage
 * @param {Array} playlists - Mảng các playlist
 */
function setUserPlaylists(playlists) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.USER_PLAYLISTS,
            JSON.stringify(playlists)
        );
        safeExecute(() => {
            window.dispatchEvent(new Event("playlists:changed"));
        }, "setUserPlaylists:dispatchEvent");
    }, "setUserPlaylists");
}

// ===== RENDER BÀI HÁT =====
/**
 * Tải và hiển thị thời lượng bài hát
 * @param {string} src - URL nguồn audio
 * @param {string} durationElementId - ID của phần tử cần cập nhật
 */
function loadTrackDuration(src, durationElementId) {
    safeExecute(() => {
        const audio = new Audio(src);
        audio.addEventListener("loadedmetadata", () => {
            const element = querySelector(`#${durationElementId}`);
            if (element) {
                element.textContent = formatTime(audio.duration);
            }
        });
    }, `loadTrackDuration:${durationElementId}`);
}

/**
 * Tạo phần tử hàng playlist
 * @param {Object} track - Đối tượng bài hát
 * @param {number} index - Chỉ số bài hát
 * @returns {HTMLElement} Phần tử hàng
 */
function createPlaylistRow(track, index) {
    const row = document.createElement("div");
    row.className = "pl-row";
    row.setAttribute("data-index", String(index));
    row.innerHTML = `
        <div class="pl-idx">
            <span class="pl-num">${index + 1}</span>
            <button class="btn tiny del first" title="Xóa khỏi playlist" aria-label="Xóa khỏi playlist">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="pl-cell-track">
            <div class="pl-cover" style="background-image:url('${track.cover || ""}')"></div>
            <div class="pl-title" title="${track.title || ""}">${track.title || ""}</div>
        </div>
        <div class="pl-artist">${track.artist || ""}</div>
        <div class="pl-time" id="pl-dur-${index}">${DEFAULT_TIME_DISPLAY}</div>
    `;
    return row;
}

/**
 * Render các bài hát trong playlist
 * @param {HTMLElement} container - Phần tử container
 * @param {Array} tracks - Mảng các đối tượng bài hát
 */
function renderPlaylistTracks(container, tracks) {
    if (!container) return;

    container.innerHTML = "";

    tracks.forEach((track, index) => {
        const row = createPlaylistRow(track, index);
        container.appendChild(row);
        loadTrackDuration(track.src, `pl-dur-${index}`);
    });
}

/**
 * Cập nhật thông tin header của playlist
 * @param {Object} playlist - Đối tượng playlist
 * @param {number} trackCount - Số lượng bài hát
 */
function updatePlaylistHeader(playlist, trackCount) {
    const nameElement = querySelector("#pl-name");
    const coverElement = querySelector("#pl-cover");
    const countElement = querySelector("#pl-count");

    if (nameElement) {
        nameElement.textContent = playlist.name || DEFAULT_PLAYLIST_NAME;
    }

    if (coverElement) {
        coverElement.style.backgroundImage = playlist.cover
            ? `url('${playlist.cover}')`
            : "";
    }

    if (countElement) {
        countElement.textContent = `${trackCount} bài hát`;
    }
}

// ===== QUẢN LÝ TRẠNG THÁI PLAYLIST =====
/**
 * Lấy trạng thái player đã lưu từ localStorage
 * @returns {Object|null} Trạng thái đã lưu hoặc null
 */
function getSavedPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
        if (!raw) return null;
        return JSON.parse(raw);
    }, "getSavedPlayerState") ?? null;
}

/**
 * Kiểm tra xem playlist này có đang hoạt động trong player không
 * @param {Object} playlist - Đối tượng playlist
 * @returns {boolean}
 */
function isPlaylistActive(playlist) {
    const state = getSavedPlayerState();
    return !!(
        state?.playlistCtx &&
        state.playlistCtx.type === PLAYLIST_TYPES.USER &&
        state.playlistCtx.id === playlist.id
    );
}

/**
 * Đồng bộ playlist với player sau khi xóa
 * @param {Array} tracks - Mảng bài hát đã cập nhật
 * @param {Object} playlist - Đối tượng playlist
 * @param {string|null} currentTrackId - ID bài hát đang phát
 * @param {boolean} wasPlaying - Player có đang phát không
 */
function syncPlaylistWithPlayer(tracks, playlist, currentTrackId, wasPlaying) {
    if (
        typeof window.MusicBox?.setPlaylist !== "function" ||
        !Array.isArray(tracks)
    ) {
        return;
    }

    window.MusicBox.setPlaylist(tracks, {
        type: PLAYLIST_TYPES.USER,
        id: playlist.id,
    });

    if (currentTrackId) {
        const newIndex = tracks.findIndex(
            (track) => track?.id === currentTrackId
        );
        if (newIndex >= 0 && typeof window.MusicBox.playAt === "function") {
            window.MusicBox.playAt(newIndex);
            if (
                !wasPlaying &&
                typeof window.MusicBox.pause === "function"
            ) {
                window.MusicBox.pause();
            }
        }
    }
}

/**
 * Cập nhật chỉ số hàng sau khi xóa
 * @param {HTMLElement} container - Phần tử container
 */
function updateRowIndices(container) {
    const rows = querySelectorAll("#pl-body .pl-row", container);
    rows.forEach((row, index) => {
        row.setAttribute("data-index", String(index));
        const numberSpan = row.querySelector(".pl-idx .pl-num");
        if (numberSpan) {
            numberSpan.textContent = String(index + 1);
        }
    });
}

// ===== KHỞI TẠO CHÍNH =====
/**
 * Khởi tạo trang playlist
 */
async function initializePlaylistPage() {
    const playlistId = getUrlParam("id");
    const playlists = getUserPlaylists();
    const playlist =
        playlists.find((p) => p.id === playlistId) || playlists[0];

    if (!playlist) return;

    // Tải và ánh xạ các bài hát
    const songs = await loadAllSongs();
    const songMap = createIdMap(songs);
    let trackIds = Array.isArray(playlist.tracks) ? playlist.tracks.slice() : [];
    let tracks = trackIds.map((id) => songMap.get(id)).filter(Boolean);

    // Cập nhật header
    updatePlaylistHeader(playlist, tracks.length);

    // Render các bài hát
    const bodyContainer = querySelector("#pl-body");
    renderPlaylistTracks(bodyContainer, tracks);

    // ===== CHỨC NĂNG XÓA =====
    /**
     * Xóa một bài hát khỏi playlist
     * @param {number} indexToRemove - Chỉ số bài hát cần xóa
     * @param {Object} playlist - Đối tượng playlist
     * @param {Array} currentTrackIds - Mảng ID bài hát hiện tại
     * @param {Array} currentTracks - Mảng bài hát hiện tại
     * @param {Map} songMap - Bản đồ bài hát theo ID
     * @returns {Object|null} Cập nhật tracks và trackIds hoặc null
     */
    function deleteTrackFromPlaylist(
        indexToRemove,
        playlist,
        currentTrackIds,
        currentTracks,
        songMap
    ) {
        return safeExecute(() => {
            const trackToRemove = currentTracks[indexToRemove];
            const trackTitle = trackToRemove?.title || "bài này";
            const confirmed = window.confirm(
                `Xóa "${trackTitle}" khỏi playlist?`
            );

            if (!confirmed) return null;

            const playlists = getUserPlaylists();
            const playlistIndex = playlists.findIndex(
                (p) => p.id === playlist.id
            );

            if (playlistIndex < 0) return null;

            const trackIdToRemove = currentTrackIds[indexToRemove];
            if (!trackIdToRemove) return null;

            // Xóa bài hát khỏi playlist
            playlists[playlistIndex].tracks = (
                playlists[playlistIndex].tracks || []
            ).filter((id) => id !== trackIdToRemove);

            setUserPlaylists(playlists);

            // Cập nhật mảng cục bộ
            const updatedTrackIds = playlists[playlistIndex].tracks.slice();
            const updatedTracks = updatedTrackIds
                .map((id) => songMap.get(id))
                .filter(Boolean);

            // Lấy trạng thái player để đồng bộ
            const playerState = getSavedPlayerState();
            const wasPlaying = !!playerState?.isPlaying;
            const currentTrackId = playerState?.currentId || null;

            // Đồng bộ với player nếu playlist này đang hoạt động
            if (isPlaylistActive(playlist)) {
                syncPlaylistWithPlayer(
                    updatedTracks,
                    playlist,
                    currentTrackId,
                    wasPlaying
                );
            }

            // Xóa hàng khỏi DOM
            const rowToRemove = querySelector(
                `#pl-body .pl-row[data-index="${indexToRemove}"]`
            );
            if (rowToRemove) {
                rowToRemove.remove();
            }

            // Cập nhật chỉ số các hàng còn lại
            updateRowIndices(bodyContainer);

            // Cập nhật số lượng
            updatePlaylistHeader(playlist, updatedTracks.length);

            return {
                trackIds: updatedTrackIds,
                tracks: updatedTracks,
            };
        }, "deleteTrackFromPlaylist") ?? null;
    }

    // ===== HIGHLIGHT BÀI HÁT HIỆN TẠI =====
    /**
     * Xóa tất cả highlight hàng hiện tại
     */
    function clearAllHighlights() {
        const rows = querySelectorAll("#pl-body .pl-row");
        rows.forEach((row) => row.classList.remove("is-current"));
    }

    /**
     * Highlight hàng đang phát
     * @param {Object} playlist - Đối tượng playlist
     */
    function highlightCurrentRow(playlist) {
        safeExecute(() => {
            if (!isPlaylistActive(playlist)) {
                clearAllHighlights();
                return;
            }

            const currentIndex =
                typeof window.MusicBox?.currentIndex === "function"
                    ? window.MusicBox.currentIndex()
                    : -1;

            clearAllHighlights();

            if (currentIndex >= 0) {
                const currentRow = querySelector(
                    `#pl-body .pl-row[data-index="${currentIndex}"]`
                );
                if (currentRow) {
                    currentRow.classList.add("is-current");
                    currentRow.scrollIntoView({
                        block: "nearest",
                        behavior: "smooth",
                    });
                }
            }
        }, "highlightCurrentRow");
    }

    // Thiết lập listener thay đổi bài hát
    window.addEventListener("musicbox:trackchange", () => {
        highlightCurrentRow(playlist);
    });
    highlightCurrentRow(playlist);

    // ===== TƯƠNG TÁC HÀNG =====
    /**
     * Xử lý click hàng để phát bài hát
     * @param {HTMLElement} row - Phần tử hàng được click
     * @param {Array} currentTracks - Mảng bài hát hiện tại
     * @param {Object} playlist - Đối tượng playlist
     */
    function handleRowClick(row, currentTracks, playlist) {
        const index = Number(row.getAttribute("data-index")) || 0;

        // Đặt playlist làm hoạt động
        if (typeof window.MusicBox?.setPlaylist === "function") {
            window.MusicBox.setPlaylist(currentTracks, {
                type: PLAYLIST_TYPES.USER,
                id: playlist.id,
            });
        }

        // Phát bài hát
        if (typeof window.MusicBox?.playAt === "function") {
            window.MusicBox.playAt(index);
        }

        // Highlight ngay lập tức
        clearAllHighlights();
        row.classList.add("is-current");
    }

    /**
     * Xử lý click nút xóa
     * @param {Event} event - Sự kiện click
     * @param {HTMLElement} row - Phần tử hàng
     * @param {Object} playlist - Đối tượng playlist
     * @param {Array} currentTrackIds - ID bài hát hiện tại
     * @param {Array} currentTracks - Bài hát hiện tại
     * @param {Map} songMap - Bản đồ bài hát
     */
    function handleDeleteClick(
        event,
        row,
        playlist,
        currentTrackIds,
        currentTracks,
        songMap
    ) {
        event.stopPropagation();
        const indexToRemove = Number(row.getAttribute("data-index")) || 0;

        const result = deleteTrackFromPlaylist(
            indexToRemove,
            playlist,
            currentTrackIds,
            currentTracks,
            songMap
        );

        if (result) {
            // Cập nhật biến cục bộ
            trackIds = result.trackIds;
            tracks = result.tracks;
        }
    }

    // Thiết lập listeners cho các hàng
    const rows = querySelectorAll("#pl-body .pl-row");
    rows.forEach((row) => {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
            handleRowClick(row, tracks, playlist);
        });

        const deleteButton = row.querySelector(
            ".pl-idx button.btn.tiny.del.first"
        );
        if (deleteButton) {
            deleteButton.addEventListener("click", (event) => {
                handleDeleteClick(
                    event,
                    row,
                    playlist,
                    trackIds,
                    tracks,
                    songMap
                );
            });
        }
    });
}

// ===== KHỞI TẠO =====
/**
 * Bắt đầu khởi tạo trang playlist
 */
function start() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePlaylistPage, {
            once: true,
        });
    } else {
        initializePlaylistPage();
    }
}

start();

// ===== ĐỒNG BỘ HIỂN THỊ QUEUE =====
/**
 * Kiểm tra xem phần tử có hiển thị không
 * @param {HTMLElement} element - Phần tử cần kiểm tra
 * @returns {boolean}
 */
function isElementVisible(element) {
    if (!element || element.hidden) return false;

    const computedStyle = getComputedStyle(element);
    if (
        computedStyle.display === "none" ||
        computedStyle.visibility === "hidden"
    ) {
        return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

/**
 * Đảm bảo CSS hiển thị queue được chèn
 */
function ensureQueueVisibilityCSS() {
    const HIDE_CLASS = "is-hidden";
    const STYLE_ID = "hide-playlist-style";

    if (document.getElementById(STYLE_ID)) return;

    safeExecute(() => {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `.${HIDE_CLASS} { display: none !important; }`;
        document.head.appendChild(style);
    }, "ensureQueueVisibilityCSS");
}

/**
 * Đồng bộ hiển thị nội dung chính với hiển thị queue
 */
function syncMainContentVisibility() {
    const MAIN_SELECTOR = ".main-content";
    const QUEUE_SELECTOR = ".queue";
    const HIDE_CLASS = "is-hidden";

    const mainContent = document.querySelector(MAIN_SELECTOR);
    if (!mainContent) return;

    const queueElements = querySelectorAll(QUEUE_SELECTOR);
    const isQueueVisible = queueElements.some(isElementVisible);

    mainContent.classList.toggle(HIDE_CLASS, isQueueVisible);
}

/**
 * Thiết lập observer hiển thị queue
 */
function setupQueueVisibilityObserver() {
    ensureQueueVisibilityCSS();

    const observer = new MutationObserver(syncMainContentVisibility);
    const observerOptions = {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden"],
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                syncMainContentVisibility();
                observer.observe(document.body, observerOptions);
            },
            { once: true }
        );
    } else {
        syncMainContentVisibility();
        observer.observe(document.body, observerOptions);
    }
}

setupQueueVisibilityObserver();
