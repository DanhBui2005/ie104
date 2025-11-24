// ===== AUTHENTICATION MODULE =====
// Module xác thực người dùng

// ===== CONSTANTS =====
// Các hằng số lưu trữ
const STORAGE_KEYS = {
    AUTH_USER: "auth_user",
    PLAYER_STATE: "player_state_v1",
};

// Các đường dẫn
const PATHS = {
    LANDING_PAGE: "./landingpage.html",
};

// Trạng thái mặc định của trình phát nhạc
const DEFAULT_PLAYER_STATE = {
    index: 0,
    currentTime: 0,
    isPlaying: false,
    volume: 0.8,
    shuffle: false,
    repeatMode: "off",
    queueOpen: false,
    ts: Date.now(),
};

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
 * Lấy người dùng đã xác thực từ localStorage
 * @returns {Object|null} Đối tượng người dùng hoặc null
 */
function getAuthUser() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
        if (!raw) return null;
        return JSON.parse(raw);
    }, "getAuthUser") ?? null;
}

/**
 * Xóa người dùng đã xác thực khỏi localStorage
 */
function removeAuthUser() {
    safeExecute(() => {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }, "removeAuthUser");
}

/**
 * Chuyển hướng đến trang landing
 */
function redirectToLandingPage() {
    location.replace(PATHS.LANDING_PAGE);
}

/**
 * Lấy trạng thái đã lưu của trình phát nhạc từ localStorage
 * @returns {Object|null} Trạng thái trình phát nhạc hoặc null
 */
function getPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
        if (!raw) return null;
        return JSON.parse(raw);
    }, "getPlayerState") ?? null;
}

/**
 * Lưu trạng thái trình phát nhạc vào localStorage
 * @param {Object} state - Đối tượng trạng thái trình phát nhạc
 */
function savePlayerState(state) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.PLAYER_STATE,
            JSON.stringify(state)
        );
    }, "savePlayerState");
}

// ===== PLAYER STATE MANAGEMENT =====
// Quản lý trạng thái trình phát nhạc

/**
 * Đặt cờ đăng xuất cho module trình phát nhạc
 */
function setLogoutFlag() {
    safeExecute(() => {
        if (window.__mbLogoutInProgress !== undefined) {
            window.__mbLogoutInProgress = true;
        }
    }, "setLogoutFlag");
}

/**
 * Tạm dừng phần tử audio hiện tại
 */
function pauseCurrentAudio() {
    safeExecute(() => {
        if (window.__mbAudio) {
            window.__mbAudio.pause();
        }
    }, "pauseCurrentAudio");
}

/**
 * Tạm dừng trình phát nhạc qua MusicBox API
 */
function pausePlayer() {
    safeExecute(() => {
        if (
            window.MusicBox &&
            typeof window.MusicBox.pause === "function"
        ) {
            window.MusicBox.pause();
        }
    }, "pausePlayer");
}

/**
 * Lưu trạng thái trình phát nhạc đã tạm dừng vào localStorage
 */
function savePausedPlayerState() {
    const currentState = getPlayerState();
    const pausedState = currentState
        ? { ...currentState, isPlaying: false }
        : { ...DEFAULT_PLAYER_STATE };

    savePlayerState(pausedState);
}

/**
 * Tạm dừng tất cả audio và lưu trạng thái đã tạm dừng
 */
function pauseAllAudio() {
    setLogoutFlag();
    pauseCurrentAudio();
    pausePlayer();
    savePausedPlayerState();
}

// ===== AUTHENTICATION FUNCTIONS =====
// Các hàm xác thực

/**
 * Cổng đăng nhập: yêu cầu xác thực trước khi xem trang web
 * Chuyển hướng đến trang landing nếu người dùng chưa xác thực
 */
export function gate() {
    const user = getAuthUser();
    if (!user) {
        redirectToLandingPage();
    }
}

/**
 * Đăng xuất người dùng và tùy chọn chuyển hướng đến trang landing
 * Lưu trạng thái trình phát nhạc đã tạm dừng để lần tải ứng dụng tiếp theo không tự động phát
 * @param {boolean} redirect - Có chuyển hướng đến trang landing hay không (mặc định: true)
 */
export function signOut(redirect = true) {
    // Tạm dừng tất cả audio và lưu trạng thái đã tạm dừng
    pauseAllAudio();

    // Xóa người dùng đã xác thực
    removeAuthUser();

    // Chuyển hướng nếu được yêu cầu
    if (redirect) {
        redirectToLandingPage();
    }
}
