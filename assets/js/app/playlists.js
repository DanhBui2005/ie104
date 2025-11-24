// ===== PLAYLISTS MODULE =====
// Module quản lý playlist cho ứng dụng music player

// ===== CONSTANTS =====
// Các khóa lưu trữ dữ liệu trong localStorage
const STORAGE_KEYS = {
    PLAYER_STATE: "player_state_v1", // Trạng thái player
    USER_PLAYLISTS: "user_playlists_v1", // Playlist người dùng
    LIKED_SONGS: "liked_songs", // Bài hát đã thích
    FOLLOWED_ARTISTS: "followed_artists", // Nghệ sĩ đã theo dõi
};

// Các loại playlist
const PLAYLIST_TYPES = {
    GLOBAL: "global", // Playlist toàn cục (tất cả bài hát)
    USER: "user", // Playlist do người dùng tạo
};

// Các đường dẫn và cấu hình mặc định
const DEFAULT_PLAYLIST_COVER = "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg"; // Ảnh bìa playlist mặc định
const SONGS_JSON_PATH = "./assets/music_data/songs.json"; // Đường dẫn file JSON chứa danh sách bài hát
const MIN_PLAYLIST_LENGTH = 3; // Số bài hát tối thiểu trong playlist

// ===== FALLBACK DATA =====
// Dữ liệu dự phòng khi không thể tải file JSON
const fallbackPlaylist = [
    {
        title: "Muộn Rồi Mà Sao Còn",
        artist: "Sơn Tùng M-TP",
        src: "./assets/music_data/songs/muon_roi_ma_sao_con.mp3",
        cover: "./assets/music_data/imgs_song/muon_roi_ma_sao_con.jpg",
        artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg",
    },
    {
        title: "Nơi Này Có Anh",
        artist: "Sơn Tùng M-TP",
        src: "./assets/music_data/songs/noi_nay_co_anh.mp3",
        cover: "./assets/music_data/imgs_song/noi_nay_co_anh.jpg",
        artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg",
    },
    {
        title: "Chúng Ta Của Hiện Tại",
        artist: "Sơn Tùng M-TP",
        src: "./assets/music_data/songs/chung_ta_cua_hien_tai.mp3",
        cover: "./assets/music_data/imgs_song/chung_ta_cua_hien_tai.jpg",
        artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg",
    },
    {
        title: "Gái Độc Thân",
        artist: "Tlinh",
        src: "./assets/music_data/songs/gai_doc_than.mp3",
        cover: "./assets/music_data/imgs_song/gai_doc_than.jpg",
        artistImg: "./assets/music_data/imgs_casi/tlinh.jpg",
    },
];

// ===== GLOBAL STATE =====
// Các biến trạng thái toàn cục
let playlist = []; // Danh sách bài hát hiện tại đang phát
let allSongs = []; // Danh sách tất cả bài hát có sẵn
let currentPlaylistCtx = { type: PLAYLIST_TYPES.GLOBAL, id: null }; // Context của playlist hiện tại

// ===== UTILITY FUNCTIONS =====
// Các hàm tiện ích sử dụng trong module

/**
 * Thực thi hàm một cách an toàn với xử lý lỗi
 * @param {Function} fn - Hàm cần thực thi
 * @param {string} context - Mô tả ngữ cảnh để ghi log lỗi
 * @returns {*} Kết quả của hàm hoặc null nếu có lỗi
 */
function safeExecute(fn, context = "operation") {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        return null;
    }
}

/**
 * Định dạng giây sang định dạng MM:SS
 * @param {number} seconds - Thời gian tính bằng giây
 * @returns {string} Chuỗi thời gian đã định dạng
 */
function formatTime(seconds) {
    if (!isFinite(seconds)) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
}

/**
 * Lấy tên file hiện tại từ pathname
 * @returns {string} Tên file hiện tại ở dạng chữ thường
 */
function getCurrentFilename() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
}

/**
 * Kiểm tra trang hiện tại có phải là trang chủ/index không
 * @returns {boolean}
 */
function isIndexPage() {
    const filename = getCurrentFilename();
    return filename === "index.html" || filename === "";
}

/**
 * Đặt playlist thành danh sách toàn cục (tất cả bài hát)
 */
function setGlobalPlaylist() {
    currentPlaylistCtx = { type: PLAYLIST_TYPES.GLOBAL, id: null };
    playlist.splice(0, playlist.length, ...allSongs);
}

// ===== PLAYLIST LOADING =====
// Các hàm liên quan đến việc tải và khởi tạo playlist

/**
 * Khởi tạo playlist từ các bài hát đã tải
 */
function initializePlaylist() {
    if (isIndexPage()) {
        setGlobalPlaylist();
    } else if (!rehydratePlaylistFromSavedContext()) {
        setGlobalPlaylist();
    }
}

/**
 * Tải playlist từ file JSON
 * @returns {Promise<Object>} Dữ liệu playlist bao gồm playlist, allSongs và currentPlaylistCtx
 */
export async function loadPlaylistFromJSON() {
    try {
        const response = await fetch(SONGS_JSON_PATH, {
            cache: "no-store",
        });
        
        if (!response.ok) {
            throw new Error("Failed to fetch songs.json");
        }
        
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("songs.json invalid or empty");
        }
        
        // Giữ danh sách đầy đủ riêng biệt với hàng đợi hiện tại
        allSongs = data;
        initializePlaylist();
        
        console.assert(
            playlist.length >= MIN_PLAYLIST_LENGTH,
            "Playlist phải có >= 3 bài"
        );
        
        return { playlist, allSongs, currentPlaylistCtx };
    } catch (error) {
        console.error("Không thể tải playlist từ songs.json:", error);
        
        // Sử dụng playlist dự phòng
        allSongs = fallbackPlaylist;
        initializePlaylist();
        
        console.warn("Đang sử dụng fallback playlist nội bộ");
        return { playlist, allSongs, currentPlaylistCtx };
    }
}

/**
 * Khôi phục playlist từ trạng thái player đã lưu
 * @returns {boolean} Trạng thái thành công
 */
function rehydratePlaylistFromSavedContext() {
    return safeExecute(() => {
        const savedState = getSavedPlayerState();
        if (!savedState?.playlistCtx) return false;
        
        if (
            savedState.playlistCtx.type === PLAYLIST_TYPES.USER &&
            Array.isArray(savedState.trackIds) &&
            savedState.trackIds.length > 0
        ) {
            // Ánh xạ ID bài hát sang đối tượng bài hát thực tế
            const trackMap = new Map(
                (allSongs || []).map((track) => [track.id, track])
            );
            const tracks = savedState.trackIds
                .map((id) => trackMap.get(id))
                .filter(Boolean);
            
            if (tracks.length > 0) {
                currentPlaylistCtx = {
                    type: PLAYLIST_TYPES.USER,
                    id: savedState.playlistCtx.id || null,
                };
                playlist.splice(0, playlist.length, ...tracks);
                return true;
            }
        }
        
        return false;
    }, "rehydratePlaylistFromSavedContext") ?? false;
}

/**
 * Lấy trạng thái player đã lưu từ localStorage
 * @returns {Object|null} Trạng thái đã lưu hoặc null
 */
function getSavedPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
        if (!raw) return null;
        
        const state = JSON.parse(raw);
        if (!state || typeof state !== "object") return null;
        
        return state;
    }, "getSavedPlayerState") ?? null;
}

// ===== USER PLAYLISTS MANAGEMENT =====
// Các hàm quản lý playlist của người dùng

/**
 * Lấy tất cả playlist người dùng từ localStorage
 * @returns {Array} Mảng các playlist người dùng
 */
export function getUserPlaylists() {
    return safeExecute(() => {
        return JSON.parse(
            localStorage.getItem(STORAGE_KEYS.USER_PLAYLISTS) || "[]"
        );
    }, "getUserPlaylists") ?? [];
}

/**
 * Lưu playlist người dùng vào localStorage
 * @param {Array} playlists - Mảng các playlist cần lưu
 */
export function setUserPlaylists(playlists) {
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

/**
 * Đảm bảo playlist demo tồn tại cho người dùng mới
 */
export function ensureDemoPlaylists() {
    const currentPlaylists = getUserPlaylists();
    if (Array.isArray(currentPlaylists) && currentPlaylists.length > 0) {
        return;
    }
    
    const demoPlaylists = [
        {
            id: "pl_chill",
            name: "My Chill Mix",
            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg",
            tracks: [
                "son_tung_mtp/muon_roi_ma_sao_con",
                "son_tung_mtp/noi_nay_co_anh",
                "son_tung_mtp/chung_ta_cua_hien_tai",
                "tlinh/gai_doc_than",
            ],
        },
        {
            id: "pl_focus",
            name: "Suy tí thôi",
            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_2.jpg",
            tracks: [
                "han_sara/dem_cuu",
                "han_sara/do_anh_si",
                "han_sara/giong_nhu_em",
                "han_sara/xinh",
            ],
        },
        {
            id: "pl_study",
            name: "IELTS",
            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_3.jpg",
            tracks: [
                "truc_nhan/sang_mat_chua",
                "truc_nhan/made_in_vietnam",
                "truc_nhan/lon_roi_con_khoc_nhe",
            ],
        },
    ];
    
    setUserPlaylists(demoPlaylists);
}

// ===== LIKED SONGS MANAGEMENT =====
// Các hàm quản lý bài hát đã thích

/**
 * Lấy danh sách bài hát đã thích từ localStorage
 * @returns {Array} Mảng các bài hát đã thích
 */
export function getLikedList() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.LIKED_SONGS);
        return raw ? JSON.parse(raw) : [];
    }, "getLikedList") ?? [];
}

/**
 * Lưu danh sách bài hát đã thích vào localStorage
 * @param {Array} list - Mảng các bài hát đã thích
 */
export function setLikedList(list) {
    safeExecute(() => {
        localStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(list));
        safeExecute(() => {
            window.dispatchEvent(new Event("liked:changed"));
        }, "setLikedList:dispatchEvent");
    }, "setLikedList");
}

/**
 * Kiểm tra xem bài hát có được thích không
 * @param {string} id - ID bài hát
 * @returns {boolean}
 */
export function isLiked(id) {
    if (!id) return false;
    const likedList = getLikedList();
    return Array.isArray(likedList) && likedList.some((song) => song?.id === id);
}

// ===== FOLLOWED ARTISTS MANAGEMENT =====
// Các hàm quản lý nghệ sĩ đã theo dõi

/**
 * Chuẩn hóa tên nghệ sĩ để so sánh nhất quán
 * @param {string} name - Tên nghệ sĩ
 * @returns {string} Tên nghệ sĩ đã chuẩn hóa
 */
export function normArtist(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

/**
 * Lấy danh sách nghệ sĩ đã theo dõi từ localStorage
 * @returns {Set} Set chứa tên nghệ sĩ đã chuẩn hóa
 */
export function getFollowedArtists() {
    return safeExecute(() => {
        const arr = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.FOLLOWED_ARTISTS) || "[]"
        );
        return new Set(Array.isArray(arr) ? arr.map(normArtist) : []);
    }, "getFollowedArtists") ?? new Set();
}

/**
 * Lưu danh sách nghệ sĩ đã theo dõi vào localStorage
 * @param {Set} artistSet - Set chứa tên nghệ sĩ
 */
export function saveFollowedArtists(artistSet) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.FOLLOWED_ARTISTS,
            JSON.stringify(Array.from(artistSet))
        );
    }, "saveFollowedArtists");
}

// ===== QUEUE RENDERING =====
// Các hàm liên quan đến việc hiển thị hàng đợi phát nhạc

/**
 * Tải và hiển thị thời lượng của bài hát
 * @param {string} src - URL nguồn audio
 * @param {string} timeElementId - ID của phần tử cần cập nhật
 */
function loadTrackDuration(src, timeElementId) {
    const audio = new Audio(src);
    audio.addEventListener("loadedmetadata", () => {
        const timeElement = document.getElementById(timeElementId);
        if (timeElement) {
            timeElement.textContent = formatTime(audio.duration);
        }
    });
}

/**
 * Hiển thị danh sách hàng đợi
 * @param {HTMLElement} queueListEl - Phần tử chứa hàng đợi
 * @param {Function} onItemClick - Hàm callback khi một mục trong hàng đợi được nhấp
 */
export function renderQueue(queueListEl, onItemClick) {
    if (!queueListEl) return;
    
    queueListEl.innerHTML = "";
    
    playlist.forEach((track, index) => {
        const row = document.createElement("div");
        row.className = "q-item";
        row.setAttribute("data-index", index);
        row.innerHTML = `
            <div class="q-cover"><img src="${track.cover}" alt="${track.title}"></div>
            <div class="q-meta">
                <div class="q-title-text">${track.title}</div>
                <div class="q-artist">${track.artist}</div>
            </div>
            <div class="q-time" id="qtime-${index}">--:--</div>
        `;
        
        row.addEventListener("click", () => {
            if (onItemClick) onItemClick(index);
        });
        
        queueListEl.appendChild(row);
        
        // Tải trước và hiển thị thời lượng
        loadTrackDuration(track.src, `qtime-${index}`);
    });
}

/**
 * Cập nhật giao diện của mục đang phát trong hàng đợi
 * @param {number} index - Chỉ số của bài hát đang phát
 */
export function updateQueueActive(index) {
    document
        .querySelectorAll(".q-item")
        .forEach((element) => element.classList.remove("current"));
    
    const activeElement = document.querySelector(
        `.q-item[data-index="${index}"]`
    );
    if (activeElement) {
        activeElement.classList.add("current");
    }
}

// ===== PLAYLIST STATE MANAGEMENT =====
// Các hàm quản lý trạng thái của playlist

/**
 * Đặt playlist hiện tại
 * @param {Array} tracksArray - Mảng các đối tượng bài hát
 * @param {Object} context - Context của playlist (loại và ID)
 * @returns {boolean} Trạng thái thành công
 */
export function setPlaylist(tracksArray, context) {
    return safeExecute(() => {
        if (!Array.isArray(tracksArray) || tracksArray.length === 0) {
            return false;
        }
        
        playlist.splice(0, playlist.length, ...tracksArray);
        currentPlaylistCtx = context?.type
            ? context
            : { type: PLAYLIST_TYPES.GLOBAL, id: null };
        
        return true;
    }, "setPlaylist") ?? false;
}

/**
 * Lấy bản sao của playlist hiện tại
 * @returns {Array} Bản sao của mảng playlist
 */
export function getPlaylist() {
    return playlist.slice();
}

/**
 * Lấy bản sao của danh sách tất cả bài hát
 * @returns {Array} Bản sao của mảng allSongs
 */
export function getAllSongs() {
    return allSongs.slice();
}

/**
 * Lấy context của playlist hiện tại
 * @returns {Object} Bản sao của currentPlaylistCtx
 */
export function getCurrentPlaylistCtx() {
    return { ...currentPlaylistCtx };
}

// ===== USER PLAYLIST OPERATIONS =====
// Các hàm thực hiện thao tác với playlist người dùng

/**
 * Chuyển đổi chuỗi thành slug thân thiện với URL
 * @param {string} str - Chuỗi cần chuyển đổi
 * @returns {string} Chuỗi đã slugify
 */
function slugify(str) {
    return String(str || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\-]/g, "");
}

/**
 * Tạo ID playlist duy nhất
 * @param {string} name - Tên playlist
 * @param {Array} existingPlaylists - Các playlist đã tồn tại để kiểm tra
 * @returns {string} ID playlist duy nhất
 */
function generateUniquePlaylistId(name, existingPlaylists) {
    const base = "pl_" + slugify(name || "new");
    let id = base || `pl_${Date.now()}`;
    let counter = 1;
    
    const existingIds = new Set(
        (existingPlaylists || []).map((playlist) => playlist?.id).filter(Boolean)
    );
    
    while (existingIds.has(id)) {
        id = `${base}_${++counter}`;
    }
    
    return id;
}

/**
 * Tìm chỉ số playlist theo ID
 * @param {Array} playlists - Mảng các playlist
 * @param {string} id - ID playlist
 * @returns {number} Chỉ số hoặc -1 nếu không tìm thấy
 */
function findPlaylistIndex(playlists, id) {
    return playlists.findIndex((playlist) => playlist?.id === id);
}

/**
 * Tạo playlist người dùng mới
 * @param {Object} options - Tùy chọn playlist
 * @param {string} options.name - Tên playlist
 * @param {string} options.cover - URL ảnh bìa
 * @returns {Object|null} Đối tượng playlist mới hoặc null nếu có lỗi
 */
export function createUserPlaylist({ name, cover }) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const id = generateUniquePlaylistId(name, playlists);
        
        const newPlaylist = {
            id,
            name: name || "Playlist mới",
            cover: cover || DEFAULT_PLAYLIST_COVER,
            tracks: [],
        };
        
        playlists.push(newPlaylist);
        setUserPlaylists(playlists);
        return newPlaylist;
    }, "createUserPlaylist") ?? null;
}

/**
 * Đổi tên playlist người dùng
 * @param {string} id - ID playlist
 * @param {string} newName - Tên mới của playlist
 * @returns {boolean} Trạng thái thành công
 */
export function renameUserPlaylist(id, newName) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const index = findPlaylistIndex(playlists, id);
        
        if (index < 0) return false;
        
        playlists[index].name = newName;
        setUserPlaylists(playlists);
        return true;
    }, "renameUserPlaylist") ?? false;
}

/**
 * Cập nhật ảnh bìa playlist
 * @param {string} id - ID playlist
 * @param {string} newCoverUrl - URL ảnh bìa mới
 * @returns {boolean} Trạng thái thành công
 */
export function updateUserPlaylistCover(id, newCoverUrl) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const index = findPlaylistIndex(playlists, id);
        
        if (index < 0) return false;
        
        playlists[index].cover = newCoverUrl;
        setUserPlaylists(playlists);
        return true;
    }, "updateUserPlaylistCover") ?? false;
}

/**
 * Xóa playlist người dùng
 * @param {string} id - ID playlist
 * @returns {boolean} Trạng thái thành công
 */
export function deleteUserPlaylist(id) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const index = findPlaylistIndex(playlists, id);
        
        if (index < 0) return false;
        
        playlists.splice(index, 1);
        setUserPlaylists(playlists);
        return true;
    }, "deleteUserPlaylist") ?? false;
}

// ===== INITIALIZATION =====
// Hàm khởi tạo module

/**
 * Khởi tạo module playlists
 * @returns {Object} Context playlist với tất cả các hàm đã export
 */
export function initPlaylists() {
    ensureDemoPlaylists();
    
    return {
        loadPlaylistFromJSON,
        getUserPlaylists,
        setUserPlaylists,
        createUserPlaylist,
        renameUserPlaylist,
        updateUserPlaylistCover,
        deleteUserPlaylist,
        getLikedList,
        setLikedList,
        isLiked,
        getFollowedArtists,
        saveFollowedArtists,
        renderQueue,
        updateQueueActive,
        setPlaylist,
        getPlaylist,
        getAllSongs,
        getCurrentPlaylistCtx,
        normArtist,
    };
}
