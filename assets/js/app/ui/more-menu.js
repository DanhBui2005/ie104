// ===== MODULE MENU THÊM (MORE MENU) =====

// ===== HẰNG SỐ =====
const DEFAULT_FILENAME = "baihat"; // Tên file mặc định khi tải xuống
const DEFAULT_EXTENSION = "mp3"; // Định dạng file mặc định
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g; // Các ký tự không hợp lệ trong tên file

// ===== HÀM TIỆN ÍCH =====
/**
 * Thực thi một cách an toàn một hàm với xử lý lỗi
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
 * Làm sạch chuỗi để sử dụng làm tên file
 * @param {string} str - Chuỗi cần làm sạch
 * @returns {string} Chuỗi đã làm sạch
 */
function sanitizeFilename(str) {
    return String(str || "")
        .replace(INVALID_FILENAME_CHARS, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Trích xuất phần mở rộng file từ URL
 * @param {string} url - URL của file
 * @returns {string} Phần mở rộng của file
 */
function getFileExtension(url) {
    return safeExecute(() => {
        const urlObj = new URL(url, location.href);
        const pathname = urlObj.pathname;
        const segment = pathname.split("/").pop() || "";
        
        if (!segment.includes(".")) {
            return DEFAULT_EXTENSION;
        }
        
        const extension = segment.split(".").pop() || DEFAULT_EXTENSION;
        return extension.split("?")[0].split("#")[0] || DEFAULT_EXTENSION;
    }, "getFileExtension") ?? DEFAULT_EXTENSION;
}

/**
 * Kiểm tra xem URL có cùng nguồn gốc với trang hiện tại không
 * @param {string} url - URL cần kiểm tra
 * @returns {boolean} True nếu cùng nguồn gốc
 */
function isSameOrigin(url) {
    return safeExecute(() => {
        const urlObj = new URL(url, location.href);
        return urlObj.origin === location.origin;
    }, "isSameOrigin") ?? true;
}

/**
 * Tạo một phần tử liên kết tải xuống
 * @param {string} href - URL của liên kết
 * @param {string} filename - Tên file khi tải xuống
 * @param {boolean} openInNewTab - Có mở trong tab mới không
 * @returns {HTMLElement} Phần tử anchor
 */
function createDownloadLink(href, filename, openInNewTab = false) {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.rel = "noopener";
    
    if (openInNewTab) {
        link.target = "_blank";
    }
    
    return link;
}

/**
 * Kích hoạt tải xuống thông qua phần tử anchor
 * @param {HTMLElement} link - Phần tử anchor
 */
function triggerDownload(link) {
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// ===== QUẢN LÝ MENU =====
/**
 * Thiết lập chức năng chuyển đổi menu thêm
 * @param {HTMLElement} menuButton - Phần tử nút menu
 * @param {HTMLElement} menu - Phần tử menu
 * @returns {Function} Hàm để ẩn menu
 */
function setupMenuToggle(menuButton, menu) {
    let handleDocumentClick = null;
    let handleEscape = null;

    /**
     * Đóng menu thêm
     */
    function hideMenu() {
        if (!menu) return;
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
        
        if (handleDocumentClick) {
            document.removeEventListener("click", handleDocumentClick, true);
        }
        if (handleEscape) {
            document.removeEventListener("keydown", handleEscape, true);
        }
    }

    /**
     * Xử lý các cú nhấp chuột bên ngoài menu
     * @param {Event} event - Sự kiện click
     */
    handleDocumentClick = (event) => {
        if (
            menu.contains(event.target) ||
            menuButton.contains(event.target)
        ) {
            return;
        }
        hideMenu();
    };

    /**
     * Xử lý khi nhấn phím Escape
     * @param {KeyboardEvent} event - Sự kiện bàn phím
     */
    handleEscape = (event) => {
        if (event.key === "Escape") {
            hideMenu();
        }
    };

    menuButton.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("open");
        menu.setAttribute("aria-hidden", String(!isOpen));
        
        if (isOpen) {
            document.addEventListener("click", handleDocumentClick, true);
            document.addEventListener("keydown", handleEscape, true);
        } else {
            hideMenu();
        }
    });

    return hideMenu;
}

// ===== CHỨC NĂNG TẢI XUỐNG =====
/**
 * Tạo tên file an toàn từ dữ liệu bài hát
 * @param {Object} track - Đối tượng bài hát
 * @param {string} url - URL của bài hát
 * @returns {string} Tên file an toàn
 */
function generateFilename(track, url) {
    const title = track.title || DEFAULT_FILENAME;
    const artist = track.artist ? ` - ${track.artist}` : "";
    const base = sanitizeFilename(title + artist) || DEFAULT_FILENAME;
    const extension = getFileExtension(url);
    return `${base}.${extension}`;
}

/**
 * Tải xuống file từ URL cùng nguồn gốc
 * @param {string} url - URL của file
 * @param {string} filename - Tên file khi tải xuống
 */
function downloadSameOrigin(url, filename) {
    const link = createDownloadLink(url, filename);
    triggerDownload(link);
}

/**
 * Tải xuống file từ URL khác nguồn gốc
 * @param {string} url - URL của file
 * @param {string} filename - Tên file khi tải xuống
 */
async function downloadCrossOrigin(url, filename) {
    try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
            throw new Error("Fetch failed");
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const link = createDownloadLink(objectUrl, filename);
        triggerDownload(link);
        
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error("Failed to download cross-origin file:", error);
        // Giải pháp dự phòng: mở trong tab mới
        const link = createDownloadLink(url, filename, true);
        triggerDownload(link);
    }
}

/**
 * Xử lý tải xuống bài hát
 * @param {Object} playerContext - Ngữ cảnh trình phát
 * @param {Object} playlistContext - Ngữ cảnh danh sách phát
 * @param {HTMLElement} menu - Phần tử menu
 * @param {Function} hideMenu - Hàm để ẩn menu
 */
async function handleDownload(playerContext, playlistContext, menu, hideMenu) {
    try {
        const playlist = playlistContext.getPlaylist();
        const currentIndex = playerContext.getCurrentIndex();
        const currentTrack = playlist[currentIndex] || {};
        const trackUrl = currentTrack.src;
        
        if (!trackUrl) {
            hideMenu();
            return;
        }
        
        const filename = generateFilename(currentTrack, trackUrl);
        const sameOrigin = isSameOrigin(trackUrl);
        
        if (sameOrigin) {
            downloadSameOrigin(trackUrl, filename);
        } else {
            await downloadCrossOrigin(trackUrl, filename);
        }
    } catch (error) {
        console.error("Download error:", error);
    } finally {
        hideMenu();
    }
}

/**
 * Thiết lập chức năng cho nút tải xuống
 * @param {HTMLElement} downloadButton - Phần tử nút tải xuống
 * @param {Object} playerContext - Ngữ cảnh trình phát
 * @param {Object} playlistContext - Ngữ cảnh danh sách phát
 * @param {HTMLElement} menu - Phần tử menu
 * @param {Function} hideMenu - Hàm để ẩn menu
 */
function setupDownloadButton(
    downloadButton,
    playerContext,
    playlistContext,
    menu,
    hideMenu
) {
    if (!downloadButton) return;
    
    downloadButton.addEventListener("click", async () => {
        await handleDownload(playerContext, playlistContext, menu, hideMenu);
    });
}

// ===== THIẾT LẬP CHÍNH =====
/**
 * Thiết lập chức năng menu thêm
 * @param {Object} options - Tùy chọn thiết lập
 * @param {Object} options.playerContext - Ngữ cảnh trình phát
 * @param {Object} options.playlistContext - Ngữ cảnh danh sách phát
 */
export function setupMoreMenu({ playerContext, playlistContext }) {
    const moreButton = document.getElementById("more");
    const moreMenu = document.getElementById("more-menu");
    const downloadButton = document.getElementById("download");
    
    if (!moreButton || !moreMenu) return;

    const hideMenu = setupMenuToggle(moreButton, moreMenu);
    
    setupDownloadButton(
        downloadButton,
        playerContext,
        playlistContext,
        moreMenu,
        hideMenu
    );
}
