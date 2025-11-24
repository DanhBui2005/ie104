// ===== UI MODULE ORCHESTRATOR =====
// Module điều phối các thành phần giao diện người dùng

import { setupHeaderSearch } from "./ui/search.js";
import { setupGlobalLiveSearch } from "./ui/live-search.js";
import { setupMoreMenu } from "./ui/more-menu.js";
import { setupAddToPlaylist } from "./ui/add-to-playlist.js";
import { setupLayoutHelpers } from "./ui/layout.js";
import { setupSidebarPlaylists } from "./ui/sidebar-playlists.js";

// ===== CONSTANTS =====
// Các hằng số định nghĩa selector cho các thành phần UI
const SELECTORS = {
    MENU_BUTTONS: ".menu .menu-btn",
    LOGOUT_BUTTON: ".menu-btn.logout",
    LIKED_BUTTON: ".menu-btn.liked",
    YOUR_BUTTON: ".menu-btn.your",
    EXPLORE_BUTTON: ".menu-btn.explore",
    RECENT_BUTTON: ".menu-btn.recent",
};

// Ánh xạ trang tương ứng với selector sidebar
const PAGE_TO_SELECTOR_MAP = {
    "index.html": SELECTORS.EXPLORE_BUTTON,
    "hoso.html": SELECTORS.YOUR_BUTTON,
    "yeuthich.html": SELECTORS.LIKED_BUTTON,
    "ngheganday.html": SELECTORS.RECENT_BUTTON,
    "playlist.html": SELECTORS.YOUR_BUTTON,
};

// Đường dẫn điều hướng cho các trang
const NAVIGATION_PATHS = {
    LIKED: "./Yeuthich.html",
    YOUR: "./Hoso.html",
    EXPLORE: "./index.html",
    RECENT: "./NgheGanDay.html",
};

// Trang mặc định và các class CSS
const DEFAULT_PAGE = "index.html";
const ACTIVE_CLASS = "active";
const LOADED_CLASS = "is-loaded";

// ===== UTILITY FUNCTIONS =====
// Các hàm tiện ích

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
 * Lấy tên file của trang hiện tại từ URL
 * @returns {string} Tên file trang hiện tại ở dạng chữ thường
 */
function getCurrentPageFilename() {
    return safeExecute(() => {
        return (
            location.pathname.split("/").pop() || DEFAULT_PAGE
        ).toLowerCase();
    }, "getCurrentPageFilename") ?? DEFAULT_PAGE;
}

/**
 * Lấy selector của sidebar cho trang hiện tại
 * @param {string} filename - Tên file trang hiện tại
 * @returns {string|null} Selector cho mục sidebar đang hoạt động hoặc null
 */
function getSidebarSelectorForPage(filename) {
    if (filename === "") {
        return SELECTORS.EXPLORE_BUTTON;
    }
    return PAGE_TO_SELECTOR_MAP[filename] || null;
}

/**
 * Xóa class active khỏi tất cả các nút menu
 */
function clearActiveSidebarItems() {
    safeExecute(() => {
        const buttons = document.querySelectorAll(SELECTORS.MENU_BUTTONS);
        buttons.forEach((button) => button.classList.remove(ACTIVE_CLASS));
    }, "clearActiveSidebarItems");
}

/**
 * Đặt class active cho mục sidebar được chỉ định
 * @param {string} selector - Selector cho mục sidebar
 */
function setActiveSidebarItem(selector) {
    safeExecute(() => {
        const target = document.querySelector(selector);
        if (target) {
            target.classList.add(ACTIVE_CLASS);
        }
    }, "setActiveSidebarItem");
}

/**
 * Đặt mục sidebar đang hoạt động dựa trên trang hiện tại
 */
function setActiveSidebar() {
    const filename = getCurrentPageFilename();
    const selector = getSidebarSelectorForPage(filename);

    clearActiveSidebarItems();

    if (selector) {
        setActiveSidebarItem(selector);
    }
}

/**
 * Thêm class loaded vào body để tạo hiệu ứng chuyển trang mượt mà
 */
function addPageLoadedClass() {
    safeExecute(() => {
        requestAnimationFrame(() => {
            document.body.classList.add(LOADED_CLASS);
        });
    }, "addPageLoadedClass");
}

// ===== NAVIGATION SETUP =====
// Cài đặt các chức năng điều hướng

/**
 * Cài đặt trình xử lý sự kiện click cho nút đăng xuất
 * @param {Function} signOut - Hàm đăng xuất
 */
function setupLogoutButton(signOut) {
    safeExecute(() => {
        const logoutButton = document.querySelector(SELECTORS.LOGOUT_BUTTON);
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                signOut(true);
            });
        }
    }, "setupLogoutButton");
}

/**
 * Cài đặt nút điều hướng sidebar
 * @param {string} selector - Selector của nút
 * @param {string} path - Đường dẫn điều hướng
 * @param {Function} go - Hàm điều hướng
 */
function setupSidebarNavigationButton(selector, path, go) {
    safeExecute(() => {
        const button = document.querySelector(selector);
        if (button) {
            button.addEventListener("click", () => {
                go(path);
            });
        }
    }, `setupSidebarNavigationButton:${selector}`);
}

/**
 * Cài đặt tất cả các nút điều hướng sidebar
 * @param {Function} go - Hàm điều hướng
 */
function setupSidebarNavigation(go) {
    setupSidebarNavigationButton(
        SELECTORS.LIKED_BUTTON,
        NAVIGATION_PATHS.LIKED,
        go
    );
    setupSidebarNavigationButton(
        SELECTORS.YOUR_BUTTON,
        NAVIGATION_PATHS.YOUR,
        go
    );
    setupSidebarNavigationButton(
        SELECTORS.EXPLORE_BUTTON,
        NAVIGATION_PATHS.EXPLORE,
        go
    );
    setupSidebarNavigationButton(
        SELECTORS.RECENT_BUTTON,
        NAVIGATION_PATHS.RECENT,
        go
    );
}

/**
 * Cài đặt tất cả các module UI riêng lẻ
 * @param {Object} layoutContext - Context layout chứa hàm điều hướng
 * @param {Object} playerContext - Context của trình phát nhạc
 * @param {Object} playlistContext - Context của playlist
 */
function setupUIModules(layoutContext, playerContext, playlistContext) {
    setupHeaderSearch({ go: layoutContext.go });
    setupGlobalLiveSearch({ playerContext });
    setupMoreMenu({ playerContext, playlistContext });
    setupAddToPlaylist({ playerContext, playlistContext });
    setupSidebarPlaylists({ playlistContext, playerContext });
}

/**
 * Tạo và trả về đối tượng context UI
 * @param {Object} layoutContext - Context của layout
 * @returns {Object} Context UI với các phương thức layout
 */
function createUIContext(layoutContext) {
    return {
        go: layoutContext.go,
        setQueueVisible: layoutContext.setQueueVisible,
        pushUIState: layoutContext.pushUIState,
        setPlayerSpacer: layoutContext.setPlayerSpacer,
        updatePlayerBottomSpace: layoutContext.updatePlayerBottomSpace,
    };
}

// ===== MAIN INITIALIZATION =====
// Khởi tạo chính

/**
 * Khởi tạo module UI và cài đặt tất cả các thành phần UI
 * @param {Object} deps - Đối tượng dependencies
 * @param {Function} deps.signOut - Hàm đăng xuất
 * @param {Object} deps.playlistContext - Context của playlist
 * @param {Object} deps.playerContext - Context của trình phát nhạc
 * @returns {Object} Context UI với các phương thức điều hướng và layout
 */
export function initUI(deps) {
    const { signOut, playlistContext, playerContext } = deps;

    // Hiệu ứng chuyển trang mượt mà
    addPageLoadedClass();

    // Đặt mục sidebar đang hoạt động dựa trên trang hiện tại
    setActiveSidebar();

    // Khởi tạo các helper layout (xử lý phần lớn cài đặt UI)
    const layoutContext = setupLayoutHelpers({
        signOut,
        playerContext,
        playlistContext,
    });

    // Cài đặt các trình xử lý điều hướng
    setupLogoutButton(signOut);
    setupSidebarNavigation(layoutContext.go);

    // Cài đặt các module UI riêng lẻ
    setupUIModules(layoutContext, playerContext, playlistContext);

    // Trả về context UI
    return createUIContext(layoutContext);
}
