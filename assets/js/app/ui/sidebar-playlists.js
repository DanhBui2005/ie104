// ===== MODULE QUẢN LÝ PLAYLIST TRÊN THANH SIDEBAR =====

// ===== CÁC HẰNG SỐ CẤU HÌNH =====
// Chứa các selector CSS để truy xuất phần tử DOM
const SELECTORS = {
    ADD_BUTTON: ".menu .icon-btn.add",    // Nút thêm playlist mới
    PLAYLIST_LIST: ".pl-list",            // Danh sách các playlist
    TOAST_WRAP: ".toast-wrap",            // Container chứa thông báo toast
};

// Cấu hình cho thông báo toast
const TOAST_CONFIG = {
    STYLE_ID: "toast-style",              // ID của style tag cho toast
    DURATION: 1800,                       // Thời gian hiển thị toast (ms)
    FADE_OUT: 200,                        // Thời gian mờ dần của toast (ms)
    TYPES: {
        SUCCESS: "success",                // Loại toast thành công
        ERROR: "error",                    // Loại toast lỗi
    },
};

// CSS styles cho thông báo toast
const TOAST_STYLES = `
    .toast-wrap{position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
    .toast{min-width:240px;max-width:90vw;padding:10px 14px;border-radius:10px;color:#fff;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;transform:translateY(-6px);transition:opacity .2s ease, transform .2s ease}
    .toast.show{opacity:1;transform:translateY(0)}
    .toast.success{background:#1f8b4c}
    .toast.error{background:#a23b3b}
`;

// Cấu hình cho playlist
const PLAYLIST_CONFIG = {
    MAX_USER_PLAYLISTS: 5,                // Số lượng playlist tối đa người dùng được tạo
    MAX_NAME_LENGTH: 40,                  // Độ dài tên playlist tối đa
    TRUNCATE_LENGTH: 37,                  // Độ dài tên playlist trước khi bị cắt ngắn
    DEFAULT_NAME: "Playlist mới",         // Tên mặc định khi tạo playlist mới
    DEFAULT_PLAYLIST_NAME: "Playlist",    // Tên playlist mặc định
    FALLBACK_COVER: "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg", // Ảnh bìa mặc định
    ID_PREFIX: "pl_",                     // Tiền tố cho ID của playlist
    FILE_PICKER_DELAY: 600,               // Độ trễ cho file picker (ms)
};

// Các đường dẫn trang
const PATHS = {
    PLAYLIST_PAGE: "./playlist.html",     // Đường dẫn đến trang chi tiết playlist
};

// ===== CÁC HÀM TIỆN ÍCH =====
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
        console.error(`Lỗi trong ${context}:`, error);
        return null;
    }
}

/**
 * Chuyển đổi chuỗi thành định dạng slug thân thiện với URL
 * @param {string} str - Chuỗi cần chuyển đổi
 * @returns {string} Chuỗi đã được chuyển đổi thành slug
 */
function slugify(str) {
    return String(str || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")           // Thay thế khoảng trắng bằng dấu gạch dưới
        .replace(/[^a-z0-9_\-]/g, "");    // Loại bỏ các ký tự không hợp lệ
}

/**
 * Cắt ngắn văn bản theo độ dài tối đa với dấu ba chấm
 * @param {string} text - Văn bản cần cắt ngắn
 * @param {number} maxLength - Độ dài tối đa
 * @returns {string} Văn bản đã được cắt ngắn
 */
function truncateText(text, maxLength = PLAYLIST_CONFIG.MAX_NAME_LENGTH) {
    const str = String(text || "");
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";  // Cắt ngắn và thêm "..."
}

/**
 * Đảm bảo styles cho toast được thêm vào tài liệu
 */
function ensureToastStyle() {
    // Kiểm tra xem style đã được thêm chưa
    if (document.getElementById(TOAST_CONFIG.STYLE_ID)) return;

    safeExecute(() => {
        const style = document.createElement("style");
        style.id = TOAST_CONFIG.STYLE_ID;
        style.textContent = TOAST_STYLES;
        document.head.appendChild(style);
    }, "ensureToastStyle");
}

/**
 * Lấy hoặc tạo phần tử wrapper cho toast
 * @returns {HTMLElement} Phần tử wrapper cho toast
 */
function getToastWrap() {
    let wrap = document.querySelector(SELECTORS.TOAST_WRAP);
    if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "toast-wrap";
        document.body.appendChild(wrap);
    }
    return wrap;
}

/**
 * Hiển thị thông báo toast
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại thông báo (success hoặc error)
 */
function showToast(message, type = TOAST_CONFIG.TYPES.SUCCESS) {
    safeExecute(() => {
        const wrap = getToastWrap();
        const element = document.createElement("div");
        element.className = `toast ${
            type === TOAST_CONFIG.TYPES.ERROR
                ? TOAST_CONFIG.TYPES.ERROR
                : TOAST_CONFIG.TYPES.SUCCESS
        }`;
        element.textContent = String(message || "");
        wrap.appendChild(element);

        // Hiển thị toast với hiệu ứng
        requestAnimationFrame(() => {
            element.classList.add("show");
        });

        // Tự động ẩn toast sau một khoảng thời gian
        setTimeout(() => {
            safeExecute(() => {
                element.classList.remove("show");
                setTimeout(() => {
                    element.remove();
                }, TOAST_CONFIG.FADE_OUT);
            }, "showToast:remove");
        }, TOAST_CONFIG.DURATION);
    }, "showToast");
}

// ===== TẠO PLAYLIST MỚI =====
/**
 * Kiểm tra người dùng đã đạt đến giới hạn số lượng playlist tối đa chưa
 * @param {Array} playlists - Mảng chứa các playlist của người dùng
 * @returns {boolean} True nếu đã đạt giới hạn
 */
function isPlaylistLimitReached(playlists) {
    return (
        Array.isArray(playlists) &&
        playlists.length >= PLAYLIST_CONFIG.MAX_USER_PLAYLISTS
    );
}

/**
 * Kiểm tra tính hợp lệ của tên playlist
 * @param {string} name - Tên playlist cần kiểm tra
 * @returns {Object} Kết quả kiểm tra với isValid và thông báo lỗi
 */
function validatePlaylistName(name) {
    if (!name || !name.trim()) {
        return { isValid: false, error: null };
    }

    if (name.length > PLAYLIST_CONFIG.MAX_NAME_LENGTH) {
        return {
            isValid: false,
            error: `Tên tối đa ${PLAYLIST_CONFIG.MAX_NAME_LENGTH} ký tự`,
        };
    }

    return { isValid: true, error: null };
}

/**
 * Hỏi người dùng nhập tên playlist mới
 * @returns {string|null} Tên playlist hoặc null nếu người dùng hủy
 */
function promptPlaylistName() {
    return safeExecute(() => {
        const name = window.prompt(
            "Tên playlist mới",
            PLAYLIST_CONFIG.DEFAULT_NAME
        );
        if (name == null) return null;
        // Chuẩn hóa tên: loại bỏ khoảng trắng thừa
        return name.trim().replace(/\s+/g, " ");
    }, "promptPlaylistName") ?? null;
}

/**
 * Tạo ID duy nhất cho playlist
 * @param {string} name - Tên playlist
 * @param {Array} existingPlaylists - Các playlist đã tồn tại
 * @returns {string} ID duy nhất cho playlist
 */
function generateUniquePlaylistId(name, existingPlaylists) {
    const base = `${PLAYLIST_CONFIG.ID_PREFIX}${slugify(name || "new")}`;
    let id = base || `${PLAYLIST_CONFIG.ID_PREFIX}${Date.now()}`;
    const existingIds = new Set(
        (existingPlaylists || []).map((p) => p?.id).filter(Boolean)
    );

    // Thêm số đuôi nếu ID đã tồn tại
    let counter = 1;
    while (existingIds.has(id)) {
        id = `${base}_${++counter}`;
    }

    return id;
}

/**
 * Tạo phần tử input để chọn file ảnh
 * @returns {HTMLInputElement} Phần tử input file
 */
function createFileInput() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";          // Chỉ chấp nhận file ảnh
    input.style.display = "none";      // Ẩn input
    document.body.appendChild(input);
    return input;
}

/**
 * Đọc file dưới dạng data URL
 * @param {File} file - File cần đọc
 * @returns {Promise<string|null>} Data URL hoặc null nếu có lỗi
 */
function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl =
                typeof reader.result === "string" ? reader.result : null;
            resolve(dataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

/**
 * Hoàn tất việc tạo playlist với ảnh bìa
 * @param {string} name - Tên playlist
 * @param {string|null} cover - Data URL của ảnh bìa hoặc null
 * @param {HTMLInputElement} input - Phần tử input file
 * @param {Array} playlists - Mảng playlist hiện tại
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function finalizePlaylistCreation(
    name,
    cover,
    input,
    playlists,
    playlistContext
) {
    // Kiểm tra giới hạn số lượng playlist
    if (isPlaylistLimitReached(playlists)) {
        showToast(
            `Bạn chỉ có thể tạo tối đa ${PLAYLIST_CONFIG.MAX_USER_PLAYLISTS} playlist`,
            TOAST_CONFIG.TYPES.ERROR
        );
        safeExecute(() => input.remove(), "finalizePlaylistCreation:removeInput");
        return;
    }

    // Tạo playlist mới
    const newPlaylist = playlistContext.createUserPlaylist({
        name,
        cover: cover || PLAYLIST_CONFIG.FALLBACK_COVER,  // Dùng ảnh mặc định nếu không có
    });

    if (newPlaylist) {
        showToast("Tạo thành công", TOAST_CONFIG.TYPES.SUCCESS);
        // Gửi sự kiện để cập nhật UI
        window.dispatchEvent(new CustomEvent("playlists:changed"));
    }

    // Xóa input file
    safeExecute(() => input.remove(), "finalizePlaylistCreation:removeInput");
}

/**
 * Xử lý sự kiện thay đổi file input
 * @param {HTMLInputElement} input - Phần tử input file
 * @param {string} name - Tên playlist
 * @param {Array} playlists - Mảng playlist hiện tại
 * @param {Object} playlistContext - Ngữ cảnh playlist
 * @param {Function} finalizeOnce - Callback chỉ được gọi một lần
 */
async function handleFileInputChange(
    input,
    name,
    playlists,
    playlistContext,
    finalizeOnce
) {
    const file = input.files?.[0];
    if (!file) {
        finalizeOnce(null);
        return;
    }

    // Đọc file ảnh
    const cover = await readFileAsDataURL(file);
    finalizeOnce(cover);
}

/**
 * Thiết lập trình chọn file để chọn ảnh bìa playlist
 * @param {string} name - Tên playlist
 * @param {Array} playlists - Mảng playlist hiện tại
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function setupFilePicker(name, playlists, playlistContext) {
    const input = createFileInput();

    // Đảm bảo chỉ tạo playlist một lần duy nhất
    let isFinalized = false;
    const finalizeOnce = (cover) => {
        if (isFinalized) return;
        isFinalized = true;
        finalizePlaylistCreation(name, cover, input, playlists, playlistContext);
    };

    // Lắng nghe sự kiện thay đổi file
    input.addEventListener(
        "change",
        () => {
            handleFileInputChange(
                input,
                name,
                playlists,
                playlistContext,
                finalizeOnce
            );
        },
        { once: true }  // Chỉ lắng nghe một lần
    );

    // Mở hộp thoại chọn file
    input.click();
}

/**
 * Xử lý sự kiện click vào nút thêm playlist
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function handleAddPlaylistClick(playlistContext) {
    const playlists = playlistContext.getUserPlaylists();

    // Kiểm tra giới hạn số lượng playlist
    if (isPlaylistLimitReached(playlists)) {
        showToast(
            `Bạn chỉ có thể tạo tối đa ${PLAYLIST_CONFIG.MAX_USER_PLAYLISTS} playlist`,
            TOAST_CONFIG.TYPES.ERROR
        );
        return;
    }

    const rawName = promptPlaylistName();
    // Hủy nếu người dùng nhấn Cancel trong prompt
    if (rawName == null) return;

    // Nếu người dùng để trống hoặc chỉ toàn khoảng trắng, dùng tên mặc định
    const name = rawName.trim() ? rawName : PLAYLIST_CONFIG.DEFAULT_NAME;

    // Kiểm tra tính hợp lệ của tên
    const validation = validatePlaylistName(name);
    if (!validation.isValid) {
        if (validation.error) {
            showToast(validation.error, TOAST_CONFIG.TYPES.ERROR);
        }
        return;
    }

    // Tạo ID duy nhất (không dùng trong createUserPlaylist nhưng giữ lại để nhất quán)
    generateUniquePlaylistId(name, playlists);

    // Thiết lập trình chọn file để chọn ảnh bìa
    setupFilePicker(name, playlists, playlistContext);
}

// ===== HIỂN THỊ PLAYLIST =====
/**
 * Thiết lập styles cho ảnh bìa trên phần tử
 * @param {HTMLElement} element - Phần tử chứa ảnh bìa
 * @param {string} coverUrl - URL của ảnh bìa
 */
function setCoverImageStyles(element, coverUrl) {
    if (!element) return;

    // Thiết lập các thuộc tính CSS cho ảnh bìa
    element.style.backgroundImage = `url('${coverUrl || PLAYLIST_CONFIG.FALLBACK_COVER}')`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
}

/**
 * Điều hướng đến trang chi tiết playlist
 * @param {string} playlistId - ID của playlist
 */
function navigateToPlaylist(playlistId) {
    const url = `${PATHS.PLAYLIST_PAGE}?id=${encodeURIComponent(playlistId)}`;
    
    safeExecute(() => {
        // Sử dụng hàm điều hướng tùy chỉnh nếu có, ngược lại dùng location.href
        const go = window.__mbGo || ((url) => {
            window.location.href = url;
        });
        go(url);
    }, "navigateToPlaylist") ?? (window.location.href = url);
}

/**
 * Tạo phần tử hàng hiển thị playlist
 * @param {Object} playlist - Đối tượng playlist
 * @returns {HTMLElement} Phần tử hàng playlist
 */
function createPlaylistRow(playlist) {
    const row = document.createElement("div");
    row.className = "pl-item";
    row.dataset.plId = playlist.id;  // Lưu ID của playlist vào dataset

    // Cắt ngắn tên nếu quá dài
    const truncatedName = truncateText(
        playlist.name || PLAYLIST_CONFIG.DEFAULT_PLAYLIST_NAME,
        PLAYLIST_CONFIG.MAX_NAME_LENGTH
    );
    const trackCount = playlist.tracks?.length || 0;

    // Tạo cấu trúc HTML cho hàng playlist
    row.innerHTML = `
        <div class="pl-cover"></div>
        <div class="pl-meta">
            <div class="pl-name">${truncatedName}</div>
            <div class="pl-sub">Playlist • ${trackCount} songs</div>
        </div>
    `;

    // Thiết lập ảnh bìa
    const coverElement = row.querySelector(".pl-cover");
    setCoverImageStyles(coverElement, playlist.cover);

    // Thêm sự kiện click để điều hướng đến trang playlist
    row.addEventListener("click", () => {
        navigateToPlaylist(playlist.id);
    });

    return row;
}

/**
 * Hiển thị các playlist trong thanh sidebar
 * @param {Object} playlistContext - Ngữ cảnh playlist
 */
function renderSidebarPlaylists(playlistContext) {
    safeExecute(() => {
        const container = document.querySelector(SELECTORS.PLAYLIST_LIST);
        if (!container) return;

        const playlists = playlistContext.getUserPlaylists();
        container.innerHTML = "";  // Xóa nội dung hiện tại

        // Tạo và thêm từng playlist vào container
        playlists.forEach((playlist) => {
            const row = createPlaylistRow(playlist);
            container.appendChild(row);
        });
    }, "renderSidebarPlaylists");
}

// ===== THIẾT LẬP CHÍNH =====
/**
 * Thiết lập chức năng playlist trong thanh sidebar
 * @param {Object} options - Các tùy chọn thiết lập
 * @param {Object} options.playlistContext - Ngữ cảnh playlist
 * @param {Object} options.playerContext - Ngữ cảnh player (không dùng nhưng giữ lại để nhất quán API)
 */
export function setupSidebarPlaylists({ playlistContext, playerContext }) {
    // Tìm nút thêm playlist
    const addButton = document.querySelector(SELECTORS.ADD_BUTTON);
    if (!addButton) return;

    // Khởi tạo styles cho thông báo toast
    ensureToastStyle();

    // Thiết lập sự kiện cho nút thêm playlist
    addButton.addEventListener("click", () => {
        handleAddPlaylistClick(playlistContext);
    });

    // Hiển thị ban đầu các playlist
    renderSidebarPlaylists(playlistContext);

    // Lắng nghe sự kiện thay đổi playlist để cập nhật UI
    window.addEventListener("playlists:changed", () => {
        renderSidebarPlaylists(playlistContext);
    });
}
