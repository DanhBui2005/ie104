// ===== MODULE THÊM VÀO DANH SÁCH PHÁT =====

// ===== HẰNG SỐ =====
const TOAST_TYPES = {
    SUCCESS: "success",
    ERROR: "error",
};

const TOAST_DURATION = 1800;
const TOAST_FADE_OUT = 200;
const MOBILE_BREAKPOINT = 420;

// ===== HÀM TIỆN ÍCH =====
/**
 * Thực thi hàm một cách an toàn với xử lý lỗi
 * @param {Function} fn - Hàm cần thực thi
 * @param {string} context - Mô tả ngữ cảnh để ghi log lỗi
 * @returns {*} Kết quả hàm hoặc null khi có lỗi
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
 * Chuyển đổi các ký tự đặc biệt HTML trong chuỗi
 * @param {string} str - Chuỗi cần chuyển đổi
 * @returns {string} Chuỗi đã được chuyển đổi
 */
function escapeHtml(str) {
    return String(str || "").replace(/"/g, "&quot;");
}

/**
 * Đảm bảo phần tử style tồn tại trong tài liệu
 * @param {string} id - ID của phần tử style
 * @param {string} css - Nội dung CSS
 */
function ensureStyle(id, css) {
    safeExecute(() => {
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }, `ensureStyle:${id}`);
}

// ===== KIỂU DÁNG =====
const PICKER_STYLES = `
    .pl-picker-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    .pl-picker {
        background: var(--bg-primary);
        color: var(--text-primary);
        min-width: 360px;
        max-width: 520px;
        width: 92vw;
        border-radius: 14px;
        box-shadow: 0 14px 40px var(--shadow-color);
        overflow: hidden;
        border: 1px solid var(--border-color);
    }
    .pl-picker .hd {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color);
        font-weight: 700;
        font-size: 16px;
        color: var(--text-primary);
    }
    .pl-picker .list {
        max-height: 60vh;
        overflow: auto;
    }
    .pl-picker .row {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 12px;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
    }
    .pl-picker .row:hover {
        background: var(--hover-bg);
    }
    .pl-picker .row .cover {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        background-size: cover;
        background-position: center;
    }
    .pl-picker .row .name {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        font-size: 15px;
    }
    .pl-picker .row .count {
        opacity: 0.85;
        min-width: 48px;
        text-align: right;
    }
    .pl-picker .btn {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
        box-sizing: border-box;
        white-space: nowrap;
    }
    .pl-picker .hd .close-btn {
        background: transparent;
        border: none;
        padding: 0;
        color: var(--text-primary);
        cursor: pointer;
        border-radius: 0;
    }
    .pl-picker .hd .close-btn:hover {
        color: var(--text-primary);
        text-decoration: underline;
        background: transparent;
        border-color: transparent;
    }
    .pl-picker .hd .close-btn:focus {
        outline: none;
        text-decoration: underline;
    }
    .pl-picker .btn:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
    }
    .pl-picker .row.is-exist {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .pl-picker .row .tag {
        font-size: 12px;
        opacity: 0.9;
        background: var(--hover-bg);
        color: var(--text-primary);
        padding: 2px 6px;
        border-radius: 999px;
        border: 1px solid var(--border-color);
    }
    @media (max-width: ${MOBILE_BREAKPOINT}px) {
        .pl-picker {
            min-width: 300px;
        }
        .pl-picker .row {
            grid-template-columns: auto 1fr auto;
        }
    }
`;

const TOAST_STYLES = `
    .toast-wrap {
        position: fixed;
        left: 50%;
        top: 20px;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    }
    .toast {
        min-width: 240px;
        max-width: 90vw;
        padding: 10px 14px;
        border-radius: 10px;
        color: #fff;
        font-weight: 600;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .toast.show {
        opacity: 1;
        transform: translateY(0);
    }
    .toast.success {
        background: #1f8b4c;
    }
    .toast.error {
        background: #a23b3b;
    }
`;

/**
 * Đảm bảo kiểu dáng của modal picker được tải
 */
function ensurePickerStyle() {
    ensureStyle("pl-picker-style", PICKER_STYLES);
}

/**
 * Đảm bảo kiểu dáng của thông báo toast được tải
 */
function ensureToastStyle() {
    ensureStyle("toast-style", TOAST_STYLES);
}
// ===== THÔNG BÁO TOAST =====
/**
 * Lấy hoặc tạo phần tử container của toast
 * @returns {HTMLElement} Phần tử wrapper của toast
 */
function getToastWrap() {
    let wrapper = document.querySelector(".toast-wrap");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "toast-wrap";
        document.body.appendChild(wrapper);
    }
    return wrapper;
}

/**
 * Hiển thị thông báo toast
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại toast ('success' hoặc 'error')
 */
function showToast(message, type = TOAST_TYPES.SUCCESS) {
    safeExecute(() => {
        const wrapper = getToastWrap();
        const toast = document.createElement("div");
        toast.className = `toast ${type === TOAST_TYPES.ERROR ? TOAST_TYPES.ERROR : TOAST_TYPES.SUCCESS}`;
        toast.textContent = String(message || "");
        wrapper.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });
        
        setTimeout(() => {
            safeExecute(() => {
                toast.classList.remove("show");
                setTimeout(() => toast.remove(), TOAST_FADE_OUT);
            }, "showToast:remove");
        }, TOAST_DURATION);
    }, "showToast");
}

// ===== MODAL PICKER =====
/**
 * Đóng modal picker
 * @param {HTMLElement} overlay - Phần tử overlay cần xóa
 */
function closePicker(overlay) {
    safeExecute(() => {
        if (overlay?.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, "closePicker");
}

/**
 * Kiểm tra xem một bài hát có tồn tại trong playlist không
 * @param {Object} playlist - Đối tượng playlist
 * @param {string} trackId - ID bài hát cần kiểm tra
 * @returns {boolean}
 */
function trackExistsInPlaylist(playlist, trackId) {
    return Array.isArray(playlist.tracks) && playlist.tracks.includes(trackId);
}

/**
 * Tạo phần tử hàng playlist
 * @param {Object} playlist - Đối tượng playlist
 * @param {string} trackId - ID bài hát đang được thêm
 * @returns {HTMLElement} Phần tử hàng
 */
function createPlaylistRow(playlist, trackId) {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("data-pl-id", playlist.id);
    
    const hasTrack = trackExistsInPlaylist(playlist, trackId);
    const trackCount = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;
    
    row.innerHTML = `
        <div class="cover" style="background-image:url('${escapeHtml(playlist.cover || "")}')"></div>
        <div class="name">${playlist.name || "Playlist"}</div>
        <div class="count">${trackCount} bài</div>
        ${hasTrack ? '<span class="tag" style="margin-right:4px;">Đã có</span>' : ""}
    `;
    
    if (hasTrack) {
        row.classList.add("is-exist");
    }
    
    return row;
}

/**
 * Xử lý việc chọn playlist
 * @param {string} playlistId - ID playlist được chọn
 * @param {string} trackId - ID bài hát cần thêm
 * @param {HTMLElement} overlay - Phần tử overlay cần đóng
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function handlePlaylistSelection(playlistId, trackId, overlay, playlistContext) {
    return safeExecute(() => {
        const playlists = playlistContext.getUserPlaylists();
        const index = playlists.findIndex((playlist) => playlist?.id === playlistId);
        
        if (index < 0) {
            closePicker(overlay);
            return;
        }
        
        const targetPlaylist = playlists[index];
        if (!Array.isArray(targetPlaylist.tracks)) {
            targetPlaylist.tracks = [];
        }
        
        if (!targetPlaylist.tracks.includes(trackId)) {
            targetPlaylist.tracks.push(trackId);
        }
        
        playlistContext.setUserPlaylists(playlists);
        showToast(
            `Đã thêm vào ${targetPlaylist.name || "playlist"}`,
            TOAST_TYPES.SUCCESS
        );
        closePicker(overlay);
        return true;
    }, "handlePlaylistSelection") ?? showToast("Không thể thêm vào playlist", TOAST_TYPES.ERROR);
}

/**
 * Thiết lập trình lắng nghe sự kiện cho modal picker
 * @param {HTMLElement} overlay - Phần tử overlay
 * @param {string} trackId - ID bài hát đang được thêm
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function setupPickerEvents(overlay, trackId, playlistContext) {
    // Xử lý click
    overlay.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        
        // Đóng khi click vào overlay
        if (target.classList.contains("pl-picker-overlay")) {
            closePicker(overlay);
            return;
        }
        
        // Đóng khi click vào nút đóng
        const action = target.getAttribute("data-act");
        if (action === "close") {
            closePicker(overlay);
            return;
        }
        
        // Xử lý click vào hàng playlist
        const row = target.closest(".row");
        if (row) {
            if (row.classList.contains("is-exist")) {
                return; // Không cho phép thêm vào playlist đã có bài hát
            }
            
            const playlistId = row.getAttribute("data-pl-id");
            if (playlistId) {
                handlePlaylistSelection(playlistId, trackId, overlay, playlistContext);
            }
        }
    });
    
    // Xử lý phím Escape
    const handleEscape = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePicker(overlay);
            window.removeEventListener("keydown", handleEscape, true);
        }
    };
    window.addEventListener("keydown", handleEscape, true);
}

/**
 * Mở modal picker playlist
 * @param {string} trackId - ID bài hát cần thêm
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function openPicker(trackId, playlistContext) {
    if (!trackId) return;
    
    const playlists = playlistContext.getUserPlaylists();
    if (!Array.isArray(playlists) || playlists.length === 0) {
        return;
    }
    
    const overlay = document.createElement("div");
    overlay.className = "pl-picker-overlay";
    overlay.innerHTML = `
        <div class="pl-picker" role="dialog" aria-modal="true" aria-label="Chọn playlist">
            <div class="hd">
                <span>Chọn playlist</span>
                <button class="btn close-btn" data-act="close" aria-label="Đóng">Đóng</button>
            </div>
            <div class="list"></div>
        </div>
    `;
    
    const listElement = overlay.querySelector(".list");
    playlists.forEach((playlist) => {
        const row = createPlaylistRow(playlist, trackId);
        listElement.appendChild(row);
    });
    
    document.body.appendChild(overlay);
    setupPickerEvents(overlay, trackId, playlistContext);
}

// ===== THIẾT LẬP CHÍNH =====
/**
 * Thiết lập chức năng thêm vào playlist
 * @param {Object} options - Tùy chọn thiết lập
 * @param {Object} options.playerContext - Ngữ cảnh player
 * @param {Object} options.playlistContext - Ngữ cảnh playlist
 */
export function setupAddToPlaylist({ playerContext, playlistContext }) {
    const addButton = document.getElementById("add-to-playlist");
    if (!addButton) return;

    // Khởi tạo kiểu dáng
    ensurePickerStyle();
    ensureToastStyle();

    // Xử lý click vào nút thêm
    addButton.addEventListener("click", () => {
        safeExecute(() => {
            const playlist = playlistContext.getPlaylist();
            const currentIndex = playerContext.getCurrentIndex();
            const currentTrack = playlist[currentIndex];
            const trackId = currentTrack?.id || null;
            
            if (!trackId) {
                showToast("Không thể thêm: bài không hợp lệ", TOAST_TYPES.ERROR);
                return;
            }
            
            const userPlaylists = playlistContext.getUserPlaylists();
            if (!Array.isArray(userPlaylists) || userPlaylists.length === 0) {
                showToast("Chưa có playlist nào", TOAST_TYPES.ERROR);
                return;
            }
            
            openPicker(trackId, playlistContext);
            return true;
        }, "setupAddToPlaylist:click") ?? showToast("Đã xảy ra lỗi", TOAST_TYPES.ERROR);
    });
}
