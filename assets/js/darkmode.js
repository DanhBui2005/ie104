// ===== QUẢN LÝ CHẾ ĐỘ TỐI =====

// ===== HẰNG SỐ =====
// Khóa lưu trữ trong localStorage
const STORAGE_KEYS = {
    DARK_MODE: "musicbox-dark-mode",
};

// Các selector CSS
const SELECTORS = {
    HEADER_RIGHT: ".header-right",          // Vùng bên phải của header
    DARK_MODE_TOGGLE: ".dark-mode-toggle", // Nút chuyển đổi chế độ tối
    PREMIUM_BUTTON: ".premium-btn",        // Nút premium
};

// Các chủ đề
const THEMES = {
    DARK: "dark",   // Chế độ tối
    LIGHT: "light", // Chế độ sáng
};

// Các icon
const ICONS = {
    MOON: "fa-solid fa-moon", // Icon mặt trăng cho chế độ tối
    SUN: "fa-solid fa-sun",   // Icon mặt trời cho chế độ sáng
};

// Cấu hình animation
const ANIMATION = {
    ROTATING_CLASS: "rotating", // Class CSS cho hiệu ứng xoay
    DURATION: 300,             // Thời gian animation (ms)
};

// Các thuộc tính
const ATTRIBUTES = {
    DATA_THEME: "data-theme",       // Thuộc tính data-theme
    DATA_INITIALIZED: "data-initialized", // Thuộc tính đánh dấu đã khởi tạo
    ARIA_LABEL: "aria-label",       // Thuộc tính aria-label
    ARIA_HIDDEN: "aria-hidden",     // Thuộc tính aria-hidden
};

// Media query để kiểm tra chế độ tối của hệ thống
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const DEFAULT_THEME = THEMES.LIGHT; // Chủ đề mặc định
const INITIALIZED_FLAG = "true";    // Cờ đánh dấu đã khởi tạo

// ===== HÀM TIỆN ÍCH =====
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
 * Lấy chủ đề đã lưu từ localStorage
 * @returns {string|null} Chủ đề đã lưu hoặc null
 */
function getSavedTheme() {
    return safeExecute(() => {
        return localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    }, "getSavedTheme") ?? null;
}

/**
 * Lưu chủ đề vào localStorage
 * @param {string} theme - Chủ đề cần lưu
 */
function saveTheme(theme) {
    safeExecute(() => {
        localStorage.setItem(STORAGE_KEYS.DARK_MODE, theme);
    }, "saveTheme");
}

/**
 * Kiểm tra hệ thống có ưu tiên chế độ tối không
 * @returns {boolean} True nếu hệ thống ưu tiên chế độ tối
 */
function prefersDarkMode() {
    return safeExecute(() => {
        return window.matchMedia(MEDIA_QUERY).matches;
    }, "prefersDarkMode") ?? false;
}

/**
 * Lấy tên class icon cho chủ đề
 * @param {string} theme - Tên chủ đề
 * @returns {string} Tên class icon
 */
function getIconForTheme(theme) {
    return theme === THEMES.DARK ? ICONS.MOON : ICONS.SUN;
}

/**
 * Dark Mode Manager
 * Quản lý chế độ tối/sáng cho toàn bộ ứng dụng
 */
class DarkModeManager {
    /**
     * Tạo một thể hiện mới của DarkModeManager
     */
    constructor() {
        this.toggleButton = null; // Nút chuyển đổi chế độ tối
        this.init(); // Khởi tạo quản lý chế độ tối
    }

    /**
     * Khởi tạo dark mode
     */
    init() {
        // Áp dụng chủ đề đã lưu hoặc tùy chọn của hệ thống
        this.applyInitialTheme();

        // Tạo nút chuyển đổi
        this.createToggleButton();

        // Lắng nghe thay đổi chủ đề của hệ thống
        this.setupSystemThemeListener();
    }

    /**
     * Applies initial theme from saved preference or system
     */
    applyInitialTheme() {
        const savedTheme = getSavedTheme(); // Lấy chủ đề đã lưu

        if (savedTheme) {
            // Nếu có chủ đề đã lưu, áp dụng nó
            this.setTheme(savedTheme);
        } else {
            // Nếu không, sử dụng chủ đề của hệ thống
            const systemTheme = prefersDarkMode() ? THEMES.DARK : THEMES.LIGHT;
            this.setTheme(systemTheme);
        }
    }

    /**
     * Sets up listener for system theme changes
     */
    setupSystemThemeListener() {
        safeExecute(() => {
            const mediaQuery = window.matchMedia(MEDIA_QUERY);
            mediaQuery.addEventListener("change", (event) => {
                // Chỉ áp dụng chủ đề hệ thống nếu người dùng chưa đặt tùy chọn
                if (!getSavedTheme()) {
                    const newTheme = event.matches ? THEMES.DARK : THEMES.LIGHT;
                    this.setTheme(newTheme);
                }
            });
        }, "setupSystemThemeListener");
    }

    /**
     * Tạo nút toggle dark mode trong header
     */
    createToggleButton() {
        const headerRight = document.querySelector(SELECTORS.HEADER_RIGHT);
        if (!headerRight) return;

        // Kiểm tra xem nút đã tồn tại chưa
        const existingButton = headerRight.querySelector(
            SELECTORS.DARK_MODE_TOGGLE
        );
        if (existingButton) {
            // Nếu nút đã tồn tại, thiết lập nó
            this.setupExistingButton(existingButton);
            return;
        }

        // Nếu không, tạo nút mới
        this.createNewToggleButton(headerRight);
    }

    /**
     * Sets up existing toggle button
     * @param {HTMLElement} button - Existing button element
     */
    setupExistingButton(button) {
        this.toggleButton = button;
        this.updateToggleIcon(this.getCurrentTheme()); // Cập nhật icon theo chủ đề hiện tại

        // Thêm event listener nếu chưa có
        if (!button.dataset.initialized) {
            button.addEventListener("click", () => this.toggle());
            button.dataset.initialized = INITIALIZED_FLAG; // Đánh dấu đã khởi tạo
        }
    }

    /**
     * Creates a new toggle button
     * @param {HTMLElement} headerRight - Header right container
     */
    createNewToggleButton(headerRight) {
        this.toggleButton = document.createElement("button");
        this.toggleButton.className = "dark-mode-toggle";
        this.toggleButton.title = "Chuyển đổi chế độ sáng/tối";
        this.toggleButton.setAttribute(
            ATTRIBUTES.ARIA_LABEL,
            "Chuyển đổi dark mode"
        );
        this.toggleButton.dataset.initialized = INITIALIZED_FLAG;

        // Thêm icon vào nút
        const icon = this.createToggleIcon();
        this.toggleButton.appendChild(icon);

        // Thêm event listener cho nút
        this.toggleButton.addEventListener("click", () => this.toggle());

        // Chèn nút vào header
        this.insertToggleButton(headerRight);
    }

    /**
     * Creates toggle icon element
     * @returns {HTMLElement} Icon element
     */
    createToggleIcon() {
        const icon = document.createElement("i");
        const currentTheme = this.getCurrentTheme(); // Lấy chủ đề hiện tại
        icon.className = getIconForTheme(currentTheme); // Đặt class icon tương ứng
        icon.setAttribute(ATTRIBUTES.ARIA_HIDDEN, "true"); // Ẩn icon khỏi screen reader
        return icon;
    }

    /**
     * Inserts toggle button into header
     * @param {HTMLElement} headerRight - Header right container
     */
    insertToggleButton(headerRight) {
        const premiumButton = headerRight.querySelector(
            SELECTORS.PREMIUM_BUTTON
        );
        if (premiumButton) {
            // Nếu có nút premium, chèn nút dark mode trước nó
            headerRight.insertBefore(this.toggleButton, premiumButton);
        } else {
            // Nếu không, chèn vào đầu
            headerRight.insertBefore(
                this.toggleButton,
                headerRight.firstChild
            );
        }
    }

    /**
     * Lấy theme hiện tại
     * @returns {string} Current theme (dark or light)
     */
    getCurrentTheme() {
        // Lấy chủ đề hiện tại từ data-theme hoặc trả về chủ đề mặc định
        return (
            document.documentElement.getAttribute(ATTRIBUTES.DATA_THEME) ||
            DEFAULT_THEME
        );
    }

    /**
     * Set theme và apply lên document
     * @param {string} theme - Theme to set (dark or light)
     */
    setTheme(theme) {
        safeExecute(() => {
            // Đặt thuộc tính data-theme cho document
            document.documentElement.setAttribute(ATTRIBUTES.DATA_THEME, theme);
            saveTheme(theme); // Lưu chủ đề vào localStorage
            this.updateToggleIcon(theme); // Cập nhật icon
        }, "setTheme");
    }

    /**
     * Toggle theme giữa dark và light
     */
    toggle() {
        const currentTheme = this.getCurrentTheme();
        // Chuyển đổi giữa chế độ tối và sáng
        const newTheme =
            currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        this.setTheme(newTheme); // Áp dụng chủ đề mới
        this.animateToggleButton(); // Thực hiện animation
    }

    /**
     * Animates toggle button with rotation
     */
    animateToggleButton() {
        if (!this.toggleButton) return;

        safeExecute(() => {
            // Thêm class xoay
            this.toggleButton.classList.add(ANIMATION.ROTATING_CLASS);
            // Xóa class xoay sau khi animation kết thúc
            setTimeout(() => {
                this.toggleButton.classList.remove(ANIMATION.ROTATING_CLASS);
            }, ANIMATION.DURATION);
        }, "animateToggleButton");
    }

    /**
     * Update icon của toggle button dựa trên theme
     * @param {string} theme - Theme name
     */
    updateToggleIcon(theme) {
        if (!this.toggleButton) return;

        safeExecute(() => {
            const icon = this.toggleButton.querySelector("i");
            if (icon) {
                // Cập nhật class của icon theo chủ đề
                icon.className = getIconForTheme(theme);
            }
        }, "updateToggleIcon");
    }
}

// ===== XUẤT KHẨU VÀ KHỞI TẠO =====
/**
 * Xuất lớp DarkModeManager cho các module ES6
 */
export default DarkModeManager;

/**
 * Tự động khởi tạo DarkModeManager nếu không sử dụng module ES6
 */
if (typeof module === "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        safeExecute(() => {
            // Tạo thể hiện DarkModeManager và gán vào window
            window.darkModeManager = new DarkModeManager();
        }, "darkmode:autoInit");
    });
}
