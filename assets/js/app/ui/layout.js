// ===== MÔ-ĐUN TRỢ GIÚP BỐ CỤC =====

// ===== HẰNG SỐ =====
const STORAGE_KEYS = {
    AUTH_USER: "auth_user",
    PREMIUM_ENABLED: "premium_enabled",
};

const CSS_VARIABLES = {
    PLAYER_HEIGHT: "--player-h",
    PLAYER_BOTTOM_SPACE: "--player-bottom-space",
    PROGRESS_VALUE: "--progress-value",
    VOLUME_VALUE: "--volume-value",
};

const PAGE_EXIT_DELAY = 180;
const PROFILE_PAGE = "./Hoso.html";
const DEFAULT_LOGO_LINK = "./index.html";

// ===== CÁC HÀM TIỆN ÍCH =====
/**
 * Thực thi một hàm một cách an toàn với xử lý lỗi
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
 * Đặt thuộc tính CSS tùy chỉnh trên gốc tài liệu
 * @param {string} property - Tên thuộc tính CSS
 * @param {string} value - Giá trị thuộc tính CSS
 */
function setCSSVariable(property, value) {
    safeExecute(() => {
        document.documentElement.style.setProperty(property, value);
    }, `setCSSVariable:${property}`);
}

/**
 * Kiểm tra xem bảng hàng đợi có đang hiển thị hay không
 * @param {HTMLElement} queuePanel - Phần tử bảng hàng đợi
 * @returns {boolean}
 */
function isQueueOpen(queuePanel) {
    return queuePanel ? !queuePanel.classList.contains("hidden") : false;
}

// ===== KHOẢNG CÁCH PLAYER =====
/**
 * Lấy chiều cao phần tử player
 * @returns {number} Chiều cao player tính bằng pixel
 */
function getPlayerHeight() {
    const player = document.querySelector(".player");
    return player?.offsetHeight || 0;
}

/**
 * Đặt biến CSS chiều cao player
 */
function setPlayerSpacer() {
    const height = getPlayerHeight();
    if (height > 0) {
        setCSSVariable(CSS_VARIABLES.PLAYER_HEIGHT, `${height}px`);
    }
}

/**
 * Cập nhật biến CSS khoảng cách dưới player
 */
function updatePlayerBottomSpace() {
    const height = getPlayerHeight();
    if (height > 0) {
        setCSSVariable(CSS_VARIABLES.PLAYER_BOTTOM_SPACE, `${height}px`);
    }
}

// ===== AVATAR TIÊU ĐỀ =====
/**
 * Lấy khóa lưu trữ avatar cho người dùng hiện tại
 * @returns {string} Khóa avatar
 */
function getAvatarKey() {
    return (
        safeExecute(() => {
            const userData = JSON.parse(
                localStorage.getItem(STORAGE_KEYS.AUTH_USER) || "null"
            );
            if (userData && (userData.id || userData.email)) {
                return `avatar_${userData.id || userData.email}`;
            }
            return "avatar_guest";
        }, "getAvatarKey") ?? "avatar_guest"
    );
}

/**
 * Áp dụng hình ảnh avatar tiêu đề
 */
function applyHeaderAvatar() {
    safeExecute(() => {
        const profileButton = document.querySelector(".profile-btn");
        if (!profileButton) return;

        const avatarData = localStorage.getItem(getAvatarKey());
        if (avatarData) {
            profileButton.classList.add("has-avatar");
            profileButton.style.backgroundImage = `url('${avatarData}')`;
        } else {
            profileButton.classList.remove("has-avatar");
            profileButton.style.backgroundImage = "";
        }
    }, "applyHeaderAvatar");
}

// ===== QUẢN LÝ HÀNG ĐỢI =====
/**
 * Đặt trạng thái hiển thị hàng đợi
 * @param {boolean} show - Có hiển thị hàng đợi hay không
 * @param {boolean} fromPopState - Có được kích hoạt từ sự kiện popstate hay không
 * @param {boolean} shouldFocus - Có tập trung vào nút gần đây khi đóng hay không (mặc định: true)
 */
function setQueueVisible(show, fromPopState = false, shouldFocus = true) {
    const queuePanel = document.getElementById("queue");
    const playlistSection = document.querySelector(".playlist");
    const recentButton = document.querySelector(".menu-btn.recent");
    const queueTitle = document.querySelector(".q-title");

    if (!queuePanel) return;

    queuePanel.classList.toggle("hidden", !show);
    if (playlistSection) {
        playlistSection.classList.toggle("hidden", show);
    }

    if (recentButton) {
        recentButton.setAttribute("aria-expanded", String(show));
    }

    // Quản lý tiêu điểm
    if (show) {
        if (queueTitle && !queueTitle.hasAttribute("tabindex")) {
            queueTitle.setAttribute("tabindex", "-1");
        }
        setTimeout(() => queueTitle?.focus(), 0);
    } else {
        // Only focus if shouldFocus is true (prevents focus on initial page load)
        if (shouldFocus) {
            recentButton?.focus();
        }
    }

    // Chuyển đổi lớp trạng thái body để nhắm CSS
    safeExecute(() => {
        document.body.classList.toggle("queue-open", !!show);
    }, "setQueueVisible:toggleBodyClass");

    if (!fromPopState && window.__mbPushUIState) {
        window.__mbPushUIState();
    }
    if (window.__mbSavePlayerState) {
        window.__mbSavePlayerState(true);
    }
}

/**
 * Đẩy trạng thái UI hiện tại vào lịch sử
 */
function pushUIState() {
    const queuePanel = document.getElementById("queue");
    const state = {
        index: window.__mbGetCurrentIndex ? window.__mbGetCurrentIndex() : 0,
        queueOpen: isQueueOpen(queuePanel),
    };

    safeExecute(() => {
        history.pushState(state, "");
    }, "pushUIState");
}

/**
 * Lấy trạng thái UI hiện tại
 * @returns {Object} Đối tượng trạng thái UI
 */
function getUIState() {
    const queuePanel = document.getElementById("queue");
    return {
        index: window.__mbGetCurrentIndex ? window.__mbGetCurrentIndex() : 0,
        queueOpen: isQueueOpen(queuePanel),
    };
}

// ===== THẢ XUỐNG HỒ SƠ =====
/**
 * Thiết lập chức năng menu thả xuống hồ sơ
 * @param {Function} go - Hàm điều hướng
 * @param {Function} signOut - Hàm đăng xuất
 */
function setupProfileDropdown(go, signOut) {
    const profileButton = document.getElementById("profile-btn");
    const profileMenu = document.getElementById("profile-menu");
    const profileOpenButton = document.getElementById("profile-open");
    const profileLogoutButton = document.getElementById("profile-logout");

    if (!profileButton || !profileMenu) return;

    /**
     * Đóng menu hồ sơ
     */
    function closeProfileMenu() {
        profileMenu.classList.remove("open");
        profileMenu.setAttribute("aria-hidden", "true");
        document.removeEventListener("click", handleProfileDocumentClick, true);
        document.removeEventListener("keydown", handleProfileEscape, true);
    }

    /**
     * Xử lý các cú nhấp chuột bên ngoài menu hồ sơ
     * @param {Event} event - Sự kiện nhấp chuột
     */
    function handleProfileDocumentClick(event) {
        if (
            profileMenu.contains(event.target) ||
            profileButton.contains(event.target)
        ) {
            return;
        }
        closeProfileMenu();
    }

    /**
     * Xử lý nhấn phím Escape
     * @param {KeyboardEvent} event - Sự kiện bàn phím
     */
    function handleProfileEscape(event) {
        if (event.key === "Escape") {
            closeProfileMenu();
        }
    }

    // Chuyển đổi menu khi nhấp vào nút
    profileButton.addEventListener("click", () => {
        const isOpen = profileMenu.classList.toggle("open");
        profileMenu.setAttribute("aria-hidden", String(!isOpen));

        if (isOpen) {
            document.addEventListener(
                "click",
                handleProfileDocumentClick,
                true
            );
            document.addEventListener("keydown", handleProfileEscape, true);
        } else {
            closeProfileMenu();
        }
    });

    // Điều hướng trang hồ sơ
    if (profileOpenButton) {
        profileOpenButton.addEventListener("click", () => {
            closeProfileMenu();
            safeExecute(() => {
                go(PROFILE_PAGE);
            }, "setupProfileDropdown:go") ??
                (window.location.href = PROFILE_PAGE);
        });
    }

    // Đăng xuất
    if (profileLogoutButton) {
        profileLogoutButton.addEventListener("click", () => {
            closeProfileMenu();
            signOut(true);
        });
    }
}

// ===== NÚT PREMIUM =====
/**
 * Áp dụng trạng thái premium cho nút
 * @param {HTMLElement} premiumButton - Phần tử nút premium
 * @param {boolean} isEnabled - Premium có được bật hay không
 */
function applyPremiumState(premiumButton, isEnabled) {
    if (!premiumButton) return;
    premiumButton.setAttribute("aria-pressed", String(isEnabled));
    premiumButton.classList.toggle("active", isEnabled);
    premiumButton.setAttribute("title", isEnabled ? "Premium (on)" : "Premium");
}

/**
 * Thiết lập chức năng nút premium
 */
function setupPremiumButton() {
    const premiumButton = document.querySelector(".premium-btn");
    if (!premiumButton) return;

    // Khởi tạo từ lưu trữ
    safeExecute(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PREMIUM_ENABLED);
        if (saved !== null) {
            applyPremiumState(premiumButton, saved === "true");
        }
    }, "setupPremiumButton:init");

    // Chuyển đổi khi nhấp chuột
    premiumButton.addEventListener("click", () => {
        const currentState =
            premiumButton.getAttribute("aria-pressed") === "true";
        const newState = !currentState;

        applyPremiumState(premiumButton, newState);

        safeExecute(() => {
            localStorage.setItem(
                STORAGE_KEYS.PREMIUM_ENABLED,
                String(newState)
            );
        }, "setupPremiumButton:save");

        // Dừng quảng cáo nếu premium được kích hoạt trong quá trình phát quảng cáo
        if (newState && window.__mbIsAdPlaying && window.__mbIsAdPlaying()) {
            safeExecute(() => {
                window.dispatchEvent(new CustomEvent("premium:activated"));
            }, "setupPremiumButton:stopAd");
        }
    });
}

// ===== HIỆU ỨNG SLIDER =====
/**
 * Cập nhật chỉ báo trực quan thanh tiến trình
 * @param {HTMLElement} progressBar - Phần tử thanh tiến trình
 * @param {string} value - Giá trị tiến trình
 */
function updateProgressBar(progressBar, value) {
    setCSSVariable(CSS_VARIABLES.PROGRESS_VALUE, `${value}%`);
}

/**
 * Cập nhật chỉ báo trực quan slider âm lượng
 * @param {HTMLElement} volumeSlider - Phần tử slider âm lượng
 */
function updateVolumeSlider(volumeSlider) {
    const value = volumeSlider.value;
    const percentage = (value / volumeSlider.max) * 100;
    setCSSVariable(CSS_VARIABLES.VOLUME_VALUE, `${percentage}%`);
}

/**
 * Thiết lập hiệu ứng trực quan cho các slider tiến trình và âm lượng
 */
function setupSliderEffects() {
    // Thanh tiến trình
    const progressBar = document.getElementById("progress");
    if (progressBar) {
        updateProgressBar(progressBar, progressBar.value);
        progressBar.addEventListener("input", (event) => {
            updateProgressBar(progressBar, event.target.value);
        });
    }

    // Slider âm lượng
    const volumeSlider = document.getElementById("volume");
    if (volumeSlider) {
        updateVolumeSlider(volumeSlider);
        volumeSlider.addEventListener("input", () => {
            updateVolumeSlider(volumeSlider);
        });
    }
}

// ===== ĐIỀU HƯỚNG =====
/**
 * Điều hướng đến URL với hiệu ứng mượt mà
 * @param {string} url - URL để điều hướng đến
 */
function go(url) {
    safeExecute(() => {
        document.body.classList.add("page-exit");
    }, "go:addExitClass");

    setTimeout(() => {
        window.location.href = url;
    }, PAGE_EXIT_DELAY);
}

/**
 * Khôi - update nút tiến/lùi
 */
function updateNavigationButtons() {
    const backButton = document.getElementById("nav-back");
    const forwardButton = document.getElementById("nav-forward");

    if (backButton) {
        // Kiểm tra xem chúng ta có thể quay lại hay không (history.length > 1 có nghĩa là có lịch sử để quay lại)
        // Tuy nhiên, một cách đáng tin cậy hơn là theo dõi trạng thái điều hướng
        // Hiện tại, chúng ta sẽ bật/tắt dựa trên một kiểm tra đơn giản
        backButton.disabled = false;
    }

    if (forwardButton) {
        // Trạng thái nút tiến tới khó xác định hơn mà không cần theo dõi
        // Chúng ta sẽ bật nó theo mặc định và để trình duyệt xử lý
        forwardButton.disabled = false;
    }
}

/**
 * Thiết lập chức năng các nút điều hướng (lùi/tiến)
 */
function setupNavigationButtons() {
    const backButton = document.getElementById("nav-back");
    const forwardButton = document.getElementById("nav-forward");

    // Thiết lập nút lùi
    if (backButton) {
        backButton.setAttribute("title", "Quay lại");
        backButton.setAttribute("aria-label", "Quay lại");

        backButton.addEventListener("click", () => {
            safeExecute(() => {
                history.back();
            }, "nav-back:click");
        });
    }

    // Thiết lập nút tiến
    if (forwardButton) {
        forwardButton.setAttribute("title", "Tiến tới");
        forwardButton.setAttribute("aria-label", "Tiến tới");

        forwardButton.addEventListener("click", () => {
            safeExecute(() => {
                history.forward();
            }, "nav-forward:click");
        });
    }

    // Cập nhật trạng thái nút khi thay đổi lịch sử
    window.addEventListener("popstate", updateNavigationButtons);

    // Cập nhật trạng thái ban đầu
    updateNavigationButtons();
}

// ===== CSS HÀNG ĐỢI =====
/**
 * Đảm bảo CSS hiển thị hàng đợi được chèn vào
 */
function ensureQueueCSS() {
    safeExecute(() => {
        if (document.getElementById("queue-visibility-style")) return;

        const style = document.createElement("style");
        style.id = "queue-visibility-style";
        style.textContent = `
            .queue {
                display: none !important;
            }
            body.queue-open .queue {
                display: block !important;
            }
        `;
        document.head.appendChild(style);
    }, "ensureQueueCSS");
}

// ===== KHỞI TẠO =====
/**
 * Thiết lập tất cả các trợ giúp bố cục
 * @param {Object} options - Tùy chọn thiết lập
 * @param {Function} options.signOut - Hàm đăng xuất
 * @param {Object} options.playerContext - Ngữ cảnh player
 * @param {Object} options.playlistContext - Ngữ cảnh danh sách phát
 * @returns {Object} Ngữ cảnh bố cục với các phương thức công khai
 */
export function setupLayoutHelpers({
    signOut,
    playerContext,
    playlistContext,
}) {
    // Khởi tạo hàng đợi - ẩn theo mặc định (không tập trung khi tải ban đầu)
    setQueueVisible(false, false, false);
    ensureQueueCSS();

    // Chuyển đổi hàng đợi từ nhấp vào tiêu đề
    const titleElement = document.getElementById("title");
    if (titleElement) {
        titleElement.style.cursor = "pointer";
        titleElement.setAttribute("title", "Mở/đóng Queue");
        titleElement.addEventListener("click", () => {
            const queuePanel = document.getElementById("queue");
            const shouldOpen = isQueueOpen(queuePanel);
            setQueueVisible(!shouldOpen);
        });
    }

    // Khoảng cách player
    setPlayerSpacer();
    window.addEventListener("resize", setPlayerSpacer);
    updatePlayerBottomSpace();
    window.addEventListener("resize", updatePlayerBottomSpace);
    window.addEventListener("orientationchange", updatePlayerBottomSpace);

    // Avatar tiêu đề
    applyHeaderAvatar();
    window.addEventListener("avatar:changed", applyHeaderAvatar);

    // Thả xuống hồ sơ
    setupProfileDropdown(go, signOut);

    // Nút premium
    setupPremiumButton();

    // Nút điều hướng (lùi/tiến)
    setupNavigationButtons();

    // Hiệu ứng trực quan
    setupSliderEffects();

    // Điều hướng mượt mà cho liên kết logo
    const logoLink = document.querySelector("a.logo-link");
    if (logoLink) {
        logoLink.addEventListener("click", (event) => {
            event.preventDefault();
            go(logoLink.getAttribute("href") || DEFAULT_LOGO_LINK);
        });
    }

    // Quản lý lịch sử
    safeExecute(() => {
        history.replaceState(getUIState(), "");
    }, "setupLayoutHelpers:replaceState");

    window.addEventListener("popstate", (event) => {
        const state = event.state;
        if (!state) return;

        if (playerContext.loadTrack) {
            playerContext.loadTrack(state.index);
        }

        if (playerContext.isCurrentlyPlaying()) {
            playerContext.play();
        } else if (playerContext.setPlayUI) {
            playerContext.setPlayUI(false);
        }

        setQueueVisible(!!state.queueOpen, true);

        if (playerContext.savePlayerState) {
            playerContext.savePlayerState(true);
        }
    });

    window.addEventListener("beforeunload", () => {
        if (playerContext.savePlayerState) {
            playerContext.savePlayerState(true);
        }
    });

    // Tiết lộ các hàm toàn cầu cho các mô-đun khác
    window.__mbPushUIState = pushUIState;
    window.__mbSetQueueVisible = setQueueVisible;
    window.__mbGo = go;

    return {
        go,
        setQueueVisible,
        pushUIState,
        setPlayerSpacer,
        updatePlayerBottomSpace,
    };
}
