// ===== MODULE PLAYER NHẠC =====

// ===== HẰNG SỐ =====
// Các chế độ phát lại
const REPEAT_MODES = {
    OFF: "off",  // Tắt phát lại
    ALL: "all",  // Phát lại tất cả
    ONE: "one",  // Phát lại một bài
};

const PLAYER_STATE_KEY = "player_state_v1";  // Khóa lưu trạng thái player
const STATE_SAVE_THROTTLE_MS = 500;          // Thời gian chờ lưu trạng thái (ms)
const TIME_BUFFER_SECONDS = 0.2;             // Thời gian đệm khi tua
const DEFAULT_VOLUME = 0.8;                  // Âm lượng mặc định
const MOBILE_BREAKPOINT = 900;               // Điểm ngắt cho giao diện mobile
const NAVIGATION_TYPE_RELOAD = 1;            // Loại điều hướng tải lại trang

// Các selector bị khóa khi phát quảng cáo
const AD_LOCK_SELECTORS = [
    "#play",          // Nút play
    "#next",          // Nút next
    "#prev",          // Nút prev
    "#shuffle",       // Nút xáo trộn
    "#repeat",        // Nút phát lại
    "#progress",      // Thanh tiến trình
    "#queue-list",    // Danh sách hàng đợi
    "#pl-tbody tr",   // Dòng trong bảng playlist
    ".song-card",     // Thẻ bài hát
    ".song-item",     // Mục bài hát
    ".q-list",        // Danh sách hàng đợi
    ".q-item",        // Mục hàng đợi
    ".q-row",         // Dòng hàng đợi
];

// ===== BIẾN TRẠNG THÁI =====
// Trạng thái player
let audio = null;                           // Đối tượng audio
let index = 0;                              // Chỉ số bài hát hiện tại
let isPlaying = false;                      // Trạng thái phát nhạc
let shuffle = false;                        // Trạng thái xáo trộn
let repeatMode = REPEAT_MODES.OFF;          // Chế độ phát lại

// Trạng thái quảng cáo
let isAdPlaying = false;                    // Trạng thái phát quảng cáo
let adAfterCallback = null;                 // Callback sau quảng cáo
let adShownThisTrackCycle = false;          // Đã hiển thị quảng cáo trong chu kỳ này
let lastAdTrackId = null;                   // ID bài hát cuối cùng có quảng cáo
let currentTrackKey = null;                 // Khóa bài hát hiện tại

// Cờ đăng xuất
let logoutInProgress = false;               // Trạng thái đang đăng xuất

// Các phần tử DOM (sẽ được thiết lập trong quá trình khởi tạo)
let elements = {};

// Lưu trạng thái player
let lastStateSavedAt = 0;                   // Thời điểm lưu trạng thái cuối cùng

// ===== TRỢ GIÚP KHỞI TẠO =====
/**
 * Phát hiện nếu đây là lần truy cập đầu tiên
 * @returns {boolean}
 */
function detectFirstVisit() {
    try {
        const isFirst = !sessionStorage.getItem("app_started");
        sessionStorage.setItem("app_started", "1");
        return isFirst;
    } catch {
        return false;
    }
}

/**
 * Phát hiện nếu người dùng vừa đăng nhập
 * @returns {boolean}
 */
function detectJustLoggedIn() {
    try {
        const currentUser = localStorage.getItem("auth_user") || "";
        const seenUser = sessionStorage.getItem("seen_auth_user") || "";
        if (currentUser && currentUser !== seenUser) {
            sessionStorage.setItem("seen_auth_user", currentUser);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

const FIRST_VISIT = detectFirstVisit();
const JUST_LOGGED_IN = detectJustLoggedIn();

// ===== TÀI SẢN QUẢNG CÁO =====
const adAssets = {
    title: "Quảng cáo",                                                  // Tiêu đề quảng cáo
    artist: "Tài trợ",                                                    // Tên nghệ sĩ
    src: "./assets/quang_cao/songs_quang_cao/quang_cao.mp3",             // Nguồn file âm thanh
    cover: "./assets/quang_cao/imgs_banner_quang_cao/quang_cao.png",     // Ảnh bìa
    artistImg: "./assets/quang_cao/imgs_logo_quang_cao/quang_cao.png",    // Ảnh nghệ sĩ
};

// ===== HÀM TIỆN ÍCH =====
/**
 * Thực thi hàm một cách an toàn với xử lý lỗi
 * @param {Function} fn - Hàm cần thực thi
 * @param {string} context - Mô tả ngữ cảnh để ghi log lỗi
 * @returns {*} Kết quả hàm hoặc null nếu có lỗi
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
 * Định dạng giây thành định dạng MM:SS
 * @param {number} seconds - Thời gian tính bằng giây
 * @returns {string} Chuỗi thời gian đã định dạng
 */
function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
}

/**
 * Kiểm tra xem điều hướng có phải là tải lại trang không
 * @returns {boolean}
 */
function isReloadNavigation() {
    return (
        safeExecute(() => {
            const navEntries =
                performance.getEntriesByType &&
                performance.getEntriesByType("navigation");
            if (navEntries?.[0]?.type === "string") {
                return navEntries[0].type === "reload";
            }
            // Fallback (API đã lỗi thời)
            if (performance?.navigation?.type === "number") {
                return performance.navigation.type === NAVIGATION_TYPE_RELOAD;
            }
            return false;
        }, "isReloadNavigation") ?? false
    );
}

/**
 * Lấy khóa duy nhất cho một bài hát
 * @param {Object} track - Đối tượng bài hát
 * @returns {string|null} Khóa bài hát hoặc null
 */
function getTrackKey(track) {
    if (!track) return null;
    return track.id || track.src || `${track.title}|${track.artist}` || null;
}

/**
 * Cập nhật biểu tượng phát/tạm dừng UI
 * @param {boolean} isPlaying - Âm thanh có đang phát không
 */
function setPlayUI(isPlaying) {
    if (!elements.playIcon) return;
    elements.playIcon.classList.toggle("fa-play", !isPlaying);
    elements.playIcon.classList.toggle("fa-pause", isPlaying);
}

/**
 * Bật hoặc tắt điều khiển player
 * @param {boolean} disabled - Có vô hiệu hóa điều khiển không
 */
function setControlsDisabled(disabled) {
    const controls = [
        elements.playBtn,
        elements.prevBtn,
        elements.nextBtn,
        elements.shuffleBtn,
        elements.repeatBtn,
    ];

    controls.forEach((button) => {
        if (!button) return;
        button.disabled = !!disabled;
        button.classList.toggle("disabled", !!disabled);
    });

    if (elements.progress) {
        elements.progress.disabled = !!disabled;
    }
}

/**
 * Kiểm tra xem premium có được bật không
 * @returns {boolean}
 */
function isPremiumOn() {
    return (
        safeExecute(
            () => localStorage.getItem("premium_enabled") === "true",
            "isPremiumOn"
        ) ?? false
    );
}

// ===== LƯU TRỮ TRẠNG THÁI PLAYER =====
/**
 * Lưu trạng thái player hiện tại vào localStorage
 * @param {boolean} force - Buộc lưu ngay cả khi đang bị giới hạn
 */
function savePlayerState(force = false) {
    if (isAdPlaying) return; // Tránh lưu quảng cáo như một bài hát

    const now = Date.now();
    if (!force && now - lastStateSavedAt < STATE_SAVE_THROTTLE_MS) {
        return; // Giới hạn tần suất lưu
    }
    lastStateSavedAt = now;

    safeExecute(() => {
        const playlist = window.__mbPlaylist || [];
        const currentTrack = playlist[index];

        const state = {
            index,
            currentTime: Math.max(
                0,
                Math.min(
                    audio.currentTime || 0,
                    isFinite(audio.duration)
                        ? audio.duration - TIME_BUFFER_SECONDS
                        : 1e9
                )
            ),
            isPlaying: logoutInProgress ? false : !!isPlaying && !isAdPlaying,
            volume: Number.isFinite(audio.volume)
                ? audio.volume
                : DEFAULT_VOLUME,
            shuffle: !!shuffle,
            repeatMode,
            queueOpen: document.body.classList.contains("queue-open"),
            ts: now,
            playlistCtx: window.__mbCurrentPlaylistCtx || {
                type: "global",
                id: null,
            },
            trackIds: playlist.map((t) => t?.id).filter(Boolean),
            currentId: currentTrack?.id || null,
            // Lưu ngữ cảnh bổ sung để giúp xử lý tải lại trang
            wasPlayingBeforeUnload: !!isPlaying && !isAdPlaying,
        };

        localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    }, "savePlayerState");
}

/**
 * Lấy trạng thái player đã lưu từ localStorage
 * @returns {Object|null} Trạng thái đã lưu hoặc null
 */
function getSavedPlayerState() {
    return (
        safeExecute(() => {
            const raw = localStorage.getItem(PLAYER_STATE_KEY);
            if (!raw) return null;

            const state = JSON.parse(raw);
            if (!state || typeof state !== "object") return null;

            return state;
        }, "getSavedPlayerState") ?? null
    );
}

/**
 * Khôi phục trạng thái player từ localStorage
 * @returns {boolean} Trạng thái thành công
 */
function restorePlayerState() {
    const savedState = getSavedPlayerState();
    if (!savedState) return false;

    return (
        safeExecute(() => {
            const playlist = window.__mbPlaylist || [];

            // Xác thực chỉ số
            if (
                typeof savedState.index !== "number" ||
                savedState.index < 0 ||
                savedState.index >= playlist.length
            ) {
                return false;
            }

            // Khôi phục âm lượng
            if (typeof savedState.volume === "number") {
                audio.volume = Math.min(1, Math.max(0, savedState.volume));
                if (elements.volume) {
                    elements.volume.value = String(audio.volume);
                    elements.volume.setAttribute(
                        "aria-valuenow",
                        String(audio.volume)
                    );
                }
                updateVolumeSlider();
                updateVolumeIcon(audio.volume);
            }

            // Khôi phục xáo trộn
            if (typeof savedState.shuffle === "boolean") {
                shuffle = savedState.shuffle;
                if (elements.shuffleBtn) {
                    elements.shuffleBtn.classList.toggle("active", shuffle);
                }
                updateShuffleA11y();
            }

            // Khôi phục chế độ phát lại
            if (
                savedState.repeatMode === REPEAT_MODES.OFF ||
                savedState.repeatMode === REPEAT_MODES.ALL ||
                savedState.repeatMode === REPEAT_MODES.ONE
            ) {
                repeatMode = savedState.repeatMode;
                if (elements.repeatBtn) {
                    elements.repeatBtn.dataset.mode = repeatMode;
                    elements.repeatBtn.classList.toggle(
                        "active",
                        repeatMode !== REPEAT_MODES.OFF
                    );
                }
                updateRepeatA11y();
            }

            // Xác định chỉ số mục tiêu (ưu tiên ánh xạ theo currentId)
            let targetIndex = savedState.index;
            if (savedState.currentId) {
                const foundIndex = playlist.findIndex(
                    (track) => track?.id === savedState.currentId
                );
                if (foundIndex >= 0) {
                    targetIndex = foundIndex;
                }
            }

            loadTrack(targetIndex);

            // Khôi phục thời gian phát lại
            const applyTime = () => {
                if (
                    typeof savedState.currentTime === "number" &&
                    isFinite(audio.duration)
                ) {
                    audio.currentTime = Math.min(
                        audio.duration - TIME_BUFFER_SECONDS,
                        Math.max(0, savedState.currentTime)
                    );
                }
            };

            if (isFinite(audio.duration)) {
                applyTime();
            } else {
                audio.addEventListener("loadedmetadata", applyTime, {
                    once: true,
                });
            }

            // Khôi phục trạng thái phát/tạm dừng
            // Buộc tạm dừng trong lần truy cập đầu tiên HOẶC ngay sau khi đăng nhập
            // Sử dụng wasPlayingBeforeUnload nếu có, nếu không thì quay lại isPlaying
            const shouldPlay =
                savedState.wasPlayingBeforeUnload !== undefined
                    ? savedState.wasPlayingBeforeUnload
                    : savedState.isPlaying;

            if (!FIRST_VISIT && !JUST_LOGGED_IN && shouldPlay) {
                // Đặt cờ ý định phát để xử lý các hạn chế về tự động phát
                sessionStorage.setItem("musicbox_play_intent", "true");
                play();
            } else {
                setPlayUI(false);
            }

            return true;
        }, "restorePlayerState") ?? false
    );
}

// ===== CÁC HÀM QUẢNG CÁO =====
/**
 * Áp dụng UI quảng cáo cho các phần tử player
 */
function applyAdUI() {
    safeExecute(() => {
        // Cập nhật UI player chính
        if (elements.titleEl) elements.titleEl.textContent = adAssets.title;
        if (elements.artistEl) elements.artistEl.textContent = adAssets.artist;
        if (elements.coverEl) elements.coverEl.src = adAssets.cover;

        // Cập nhật UI banner
        if (elements.bTitle) elements.bTitle.textContent = adAssets.title;
        if (elements.bArtistName)
            elements.bArtistName.textContent = adAssets.artist;
        if (elements.bCover) elements.bCover.src = adAssets.cover;
        if (elements.bArtistAvatar)
            elements.bArtistAvatar.src = adAssets.artistImg;

        // Đặt lại tiến trình
        if (elements.progress) {
            elements.progress.value = 0;
            elements.progress.style.setProperty("--progress-value", "0%");
        }

        // Đặt lại hiển thị thời gian
        if (elements.currentTimeEl) elements.currentTimeEl.textContent = "0:00";
        if (elements.durationEl) elements.durationEl.textContent = "0:00";
    }, "applyAdUI");
}

/**
 * Bắt đầu quảng cáo và thực thi callback sau đó
 * @param {Function|null} callback - Callback để thực thi sau quảng cáo
 */
function startAdThen(callback) {
    // Không bắt đầu quảng cáo nếu đã đang phát
    if (isAdPlaying) return;

    // Bỏ qua quảng cáo cho người dùng premium
    if (isPremiumOn()) {
        if (typeof callback === "function") {
            callback();
        } else {
            nextTrack(true);
        }
        return;
    }

    // Bỏ qua quảng cáo nếu đã hiển thị cho bài hát này trong chế độ phát lại một
    if (repeatMode === REPEAT_MODES.ONE && adShownThisTrackCycle) {
        if (typeof callback === "function") {
            callback();
        } else {
            nextTrack(true);
        }
        return;
    }

    isAdPlaying = true;
    adAfterCallback = typeof callback === "function" ? callback : null;
    setControlsDisabled(true);
    applyAdUI();

    audio.src = adAssets.src;
    audio.load();
    play();

    safeExecute(() => {
        if (elements.queueListEl) {
            elements.queueListEl.setAttribute("aria-disabled", "true");
        }
        document.body.classList.add("ad-locked");
    }, "startAdThen");
}

/**
 * Kết thúc quảng cáo và tiếp tục phát lại
 */
function endAdThenResume() {
    isAdPlaying = false;
    setControlsDisabled(false);

    safeExecute(() => {
        if (elements.queueListEl) {
            elements.queueListEl.removeAttribute("aria-disabled");
        }
        document.body.classList.remove("ad-locked");
    }, "endAdThenResume");

    // Thực thi callback hoặc tiếp tục bài hát tiếp theo
    if (typeof adAfterCallback === "function") {
        const callback = adAfterCallback;
        adAfterCallback = null;
        callback();
    } else {
        nextTrack(true);
    }
}

// ===== TẢI VÀ PHÁT BÀI HÁT =====
/**
 * Cập nhật các phần tử UI của bài hát
 * @param {Object} track - Đối tượng bài hát
 */
function updateTrackUI(track) {
    // Cập nhật UI player chính
    if (elements.titleEl) elements.titleEl.textContent = track.title;
    if (elements.artistEl) elements.artistEl.textContent = track.artist;
    if (elements.coverEl) elements.coverEl.src = track.cover;

    // Cập nhật UI banner
    if (elements.bTitle) elements.bTitle.textContent = track.title;
    if (elements.bArtistName) elements.bArtistName.textContent = track.artist;
    if (elements.bCover) elements.bCover.src = track.cover;
    if (elements.bArtistAvatar) {
        elements.bArtistAvatar.src = track.artistImg || track.cover;
    }
}

/**
 * Đặt lại hiển thị tiến trình và thời gian
 */
function resetProgressUI() {
    if (elements.progress) {
        elements.progress.value = 0;
        elements.progress.style.setProperty("--progress-value", "0%");
    }
    if (elements.currentTimeEl) elements.currentTimeEl.textContent = "0:00";
    if (elements.durationEl) elements.durationEl.textContent = "0:00";
}

/**
 * Tải một bài hát tại chỉ số đã cho
 * @param {number} trackIndex - Chỉ số của bài hát cần tải
 */
function loadTrack(trackIndex) {
    const playlist = window.__mbPlaylist || [];
    const track = playlist[trackIndex];
    if (!track) return;

    // Đặt lại cờ quảng cáo chỉ khi nhận dạng bài hát thay đổi
    const nextKey = getTrackKey(track);
    if (nextKey !== currentTrackKey) {
        currentTrackKey = nextKey;
        adShownThisTrackCycle = false;
        lastAdTrackId = null;
    }

    index = trackIndex;
    audio.src = track.src;
    audio.load();

    // Cập nhật UI
    updateTrackUI(track);
    resetProgressUI();

    // Tiết lộ ID bài hát hiện tại cho các module khác
    safeExecute(() => {
        window.currentTrackId = track.id || null;
    }, "loadTrack:setTrackId");

    // Cập nhật trạng thái hoạt động của hàng đợi
    if (window.__mbUpdateQueueActive) {
        window.__mbUpdateQueueActive(index);
    }

    // Thông báo cho các module khác
    safeExecute(() => {
        window.dispatchEvent(
            new CustomEvent("musicbox:trackchange", { detail: { index } })
        );
    }, "loadTrack:dispatchEvent");
}

/**
 * Phát âm thanh
 */
function play() {
    // Xử lý chính sách tự động phát bằng cách sử dụng promise
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                isPlaying = true;
                setPlayUI(true);
                safeExecute(() => {
                    window.dispatchEvent(new Event("musicbox:statechange"));
                }, "play:dispatchEvent");
            })
            .catch((error) => {
                console.warn("Autoplay was prevented:", error);
                isPlaying = false;
                setPlayUI(false);
                // Lưu ý định phát để có thể khôi phục sau khi người dùng tương tác
                sessionStorage.setItem("musicbox_play_intent", "true");
            });
    } else {
        // Fallback cho các trình duyệt cũ hơn
        isPlaying = true;
        setPlayUI(true);
        safeExecute(() => {
            window.dispatchEvent(new Event("musicbox:statechange"));
        }, "play:dispatchEvent");
    }
}

/**
 * Tạm dừng âm thanh
 */
function pause() {
    audio.pause();
    isPlaying = false;
    setPlayUI(false);
    safeExecute(() => {
        window.dispatchEvent(new Event("musicbox:statechange"));
    }, "pause:dispatchEvent");
}

/**
 * Lấy một chỉ số ngẫu nhiên khác với chỉ số hiện tại
 * @param {number} currentIndex - Chỉ số bài hát hiện tại
 * @param {number} playlistLength - Độ dài playlist
 * @returns {number} Chỉ số ngẫu nhiên
 */
function getRandomIndex(currentIndex, playlistLength) {
    if (playlistLength === 1) return currentIndex;
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * playlistLength);
    } while (randomIndex === currentIndex);
    return randomIndex;
}

/**
 * Tính toán chỉ số bài hát tiếp theo
 * @returns {number} Chỉ số bài hát tiếp theo
 */
function nextIndex() {
    const playlist = window.__mbPlaylist || [];
    if (shuffle) {
        return getRandomIndex(index, playlist.length);
    }
    return (index + 1) % playlist.length;
}

/**
 * Tính toán chỉ số bài hát trước đó
 * @returns {number} Chỉ số bài hát trước đó
 */
function prevIndex() {
    const playlist = window.__mbPlaylist || [];
    if (shuffle) {
        return getRandomIndex(index, playlist.length);
    }
    return (index - 1 + playlist.length) % playlist.length;
}

/**
 * Chuyển đến bài hát tiếp theo
 * @param {boolean} auto - Có phải tự động chuyển không
 */
function nextTrack(auto = false) {
    // Phát lại một: khởi động lại bài hát hiện tại
    if (auto && repeatMode === REPEAT_MODES.ONE) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    const playlist = window.__mbPlaylist || [];

    // Kết thúc playlist: dừng nếu không phát lại
    if (
        auto &&
        repeatMode === REPEAT_MODES.OFF &&
        !shuffle &&
        index === playlist.length - 1
    ) {
        pause();
        audio.currentTime = 0;
        return;
    }

    loadTrack(nextIndex());

    if (isPlaying || auto) {
        play();
    } else {
        setPlayUI(false);
    }

    if (window.__mbPushUIState) window.__mbPushUIState();
    savePlayerState(true);
}

/**
 * Chuyển đến bài hát trước đó
 */
function prevTrack() {
    loadTrack(prevIndex());
    if (isPlaying) play();
    if (window.__mbPushUIState) window.__mbPushUIState();
    savePlayerState(true);
}

// ===== TRỢ GIÚP KHẢ NĂNG TRUY CẬP =====
/**
 * Cập nhật các thuộc tính khả năng truy cập của nút phát lại
 */
function updateRepeatA11y() {
    if (!elements.repeatBtn) return;

    const pressed = repeatMode !== REPEAT_MODES.OFF;
    elements.repeatBtn.setAttribute("aria-pressed", String(pressed));

    const titles = {
        [REPEAT_MODES.OFF]: "Repeat: Off",
        [REPEAT_MODES.ALL]: "Repeat: All",
        [REPEAT_MODES.ONE]: "Repeat: One",
    };
    elements.repeatBtn.title = titles[repeatMode] || "Repeat";
}

/**
 * Cập nhật các thuộc tính khả năng truy cập của nút xáo trộn
 */
function updateShuffleA11y() {
    if (!elements.shuffleBtn) return;
    elements.shuffleBtn.setAttribute("aria-pressed", String(shuffle));
    elements.shuffleBtn.title = shuffle ? "Shuffle: On" : "Shuffle: Off";
}

// ===== ĐIỀU KHIỂN ÂM LƯỢNG =====
/**
 * Cập nhật chỉ báo trực quan của thanh trượt âm lượng
 */
function updateVolumeSlider() {
    if (!elements.volume) return;
    const value = elements.volume.value;
    const percentage = (value / elements.volume.max) * 100;
    elements.volume.style.setProperty("--volume-value", `${percentage}%`);
}

/**
 * Cập nhật biểu tượng âm lượng dựa trên mức âm lượng hiện tại
 * @param {number} volume - Mức âm lượng (0 đến 1)
 */
function updateVolumeIcon(volume) {
    if (!elements.volIcon) return;

    let volumeIcon = "fa-solid ";
    if (volume === 0) {
        volumeIcon += "fa-volume-xmark";
    } else if (volume < 0.5) {
        volumeIcon += "fa-volume-low";
    } else {
        volumeIcon += "fa-volume-high";
    }
    elements.volIcon.className = volumeIcon;
}

/**
 * Thiết lập chức năng chuyển đổi âm lượng di động
 */
function setupMobileVolumeToggle() {
    function toggleMobileVolume(e) {
        if (window.innerWidth > MOBILE_BREAKPOINT) return;
        const right = elements.volIcon.closest(".right");
        if (!right) return;
        e.stopPropagation();
        right.classList.toggle("show-volume");
    }

    function hideMobileVolume() {
        const right = document.querySelector(".right.show-volume");
        if (right) right.classList.remove("show-volume");
    }

    elements.volIcon.addEventListener("click", toggleMobileVolume);

    document.addEventListener(
        "click",
        (e) => {
            if (window.innerWidth > MOBILE_BREAKPOINT) return;
            const right = document.querySelector(".right");
            if (
                right &&
                (right.contains(e.target) || e.target === elements.volIcon)
            ) {
                return;
            }
            hideMobileVolume();
        },
        true
    );

    window.addEventListener("resize", () => {
        if (window.innerWidth > MOBILE_BREAKPOINT) hideMobileVolume();
    });
}

// ===== BẢO VỆ TƯƠNG TÁC QUẢNG CÁO =====
/**
 * Kiểm tra xem một phần tử có khớp với các selector bị khóa quảng cáo không
 * @param {Element} element - Phần tử cần kiểm tra
 * @returns {boolean}
 */
function isAdLockedElement(element) {
    if (!(element instanceof Element)) return false;
    return AD_LOCK_SELECTORS.some((selector) => element.closest(selector));
}

/**
 * Thiết lập các bảo vệ tương tác quảng cáo để ngăn kiểm soát trong khi quảng cáo
 */
function setupAdInteractionGuards() {
    safeExecute(() => {
        // Thêm kiểu gợi ý trực quan khi bị khóa
        if (!document.getElementById("ad-lock-style")) {
            const style = document.createElement("style");
            style.id = "ad-lock-style";
            style.textContent = `
                body.ad-locked .player .controls .btn,
                body.ad-locked #progress,
                body.ad-locked #queue-list *,
                body.ad-locked #pl-tbody tr,
                body.ad-locked .song-card,
                body.ad-locked .song-item {
                    cursor: not-allowed !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Chặn nhấp chuột trên các phần tử bị khóa
        document.addEventListener(
            "click",
            (e) => {
                if (!isAdPlaying) return;
                if (isAdLockedElement(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            },
            true
        );

        // Chặn tương tác bàn phím trên các phần tử bị khóa
        document.addEventListener(
            "keydown",
            (e) => {
                if (!isAdPlaying) return;
                if (
                    (e.key === "Enter" || e.key === " ") &&
                    isAdLockedElement(e.target)
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            },
            true
        );
    }, "setupAdInteractionGuards");
}

/**
 * Xử lý sự kiện kết thúc bài hát với logic quảng cáo
 */
function handleTrackEnded() {
    // Nếu phát lại một bài hát, chỉ hiển thị quảng cáo một lần mỗi chu kỳ bài hát
    if (repeatMode === REPEAT_MODES.ONE) {
        const playlist = window.__mbPlaylist || [];
        const currentTrack = playlist[index];
        const currentId = currentTrack?.id || null;

        if (
            !adShownThisTrackCycle &&
            currentId &&
            currentId !== lastAdTrackId
        ) {
            adShownThisTrackCycle = true;
            lastAdTrackId = currentId;
            startAdThen(() => nextTrack(true));
        } else {
            nextTrack(true); // Lặp lại mà không hiển thị quảng cáo nữa
        }
    } else {
        startAdThen(() => nextTrack(true));
    }
}


// ===== THIẾT LẬP EVENT LISTENERS =====
/**
 * Thiết lập tất cả event listeners cho điều khiển player
 */
function setupEventListeners() {
    // Kiểm tra ý định phát trong lần tương tác đầu tiên của người dùng
    function checkPlayIntent() {
        const playIntent = sessionStorage.getItem("musicbox_play_intent");
        if (playIntent === "true" && !isPlaying && !isAdPlaying) {
            sessionStorage.removeItem("musicbox_play_intent");
            play();
        }
    }

    // Thêm click listener vào tài liệu để kiểm tra ý định phát
    document.addEventListener("click", checkPlayIntent, { once: true });

    // Nút phát/tạm dừng
    if (elements.playBtn) {
        elements.playBtn.addEventListener("click", () => {
            if (isAdPlaying) return; // không thể điều khiển trong khi quảng cáo
            const playlist = window.__mbPlaylist || [];
            if (audio.src === "" && playlist.length > 0) loadTrack(index);
            isPlaying ? pause() : play();
            savePlayerState(true);
        });
    }

    // Nút trước
    if (elements.prevBtn) {
        elements.prevBtn.addEventListener("click", () => {
            if (isAdPlaying) return;
            const playlist = window.__mbPlaylist || [];
            if (playlist.length === 0) return;
            prevTrack();
        });
    }

    // Nút tiếp theo
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener("click", () => {
            if (isAdPlaying) return;
            const playlist = window.__mbPlaylist || [];
            if (playlist.length === 0) return;
            nextTrack(false);
        });
    }

    // Nút xáo trộn
    if (elements.shuffleBtn) {
        elements.shuffleBtn.addEventListener("click", () => {
            shuffle = !shuffle;
            elements.shuffleBtn.classList.toggle("active", shuffle);

            // Vô hiệu hóa phát lại một khi xáo trộn được bật
            if (repeatMode === REPEAT_MODES.ONE && shuffle) {
                repeatMode = REPEAT_MODES.ALL;
            }

            if (elements.repeatBtn) {
                elements.repeatBtn.dataset.mode = repeatMode;
                elements.repeatBtn.classList.toggle(
                    "active",
                    repeatMode !== REPEAT_MODES.OFF
                );
            }

            updateShuffleA11y();
            updateRepeatA11y();
            savePlayerState(true);
        });
    }

    // Nút phát lại
    if (elements.repeatBtn) {
        elements.repeatBtn.addEventListener("click", () => {
            // Vòng lặp qua các chế độ phát lại: tắt -> tất cả -> một -> tắt
            repeatMode =
                repeatMode === REPEAT_MODES.OFF
                    ? REPEAT_MODES.ALL
                    : repeatMode === REPEAT_MODES.ALL
                    ? REPEAT_MODES.ONE
                    : REPEAT_MODES.OFF;

            elements.repeatBtn.dataset.mode = repeatMode;
            elements.repeatBtn.classList.toggle(
                "active",
                repeatMode !== REPEAT_MODES.OFF
            );
            updateRepeatA11y();
            savePlayerState(true);
        });
    }

    // Sự kiện audio
    audio.addEventListener("loadedmetadata", () => {
        if (elements.durationEl) {
            elements.durationEl.textContent = formatTime(audio.duration);
        }
    });

    audio.addEventListener("timeupdate", () => {
        const percentage = (audio.currentTime / audio.duration) * 100;
        const value = isFinite(percentage) ? Math.round(percentage) : 0;

        if (elements.progress) {
            elements.progress.value = value;
            elements.progress.setAttribute("aria-valuenow", String(value));
            elements.progress.style.setProperty(
                "--progress-value",
                `${value}%`
            );
        }

        if (elements.currentTimeEl) {
            elements.currentTimeEl.textContent = formatTime(audio.currentTime);
        }

        savePlayerState(false);
    });

    audio.addEventListener("ended", () => {
        if (isAdPlaying) {
            endAdThenResume();
        } else if (isPremiumOn()) {
            nextTrack(true);
        } else {
            handleTrackEnded();
        }
    });

    // Ngăn tạm dừng quảng cáo
    audio.addEventListener("pause", () => {
        if (isAdPlaying) {
            safeExecute(() => audio.play(), "preventAdPause");
        }
    });

    // Thanh tiến trình
    if (elements.progress) {
        elements.progress.addEventListener("input", (e) => {
            if (isAdPlaying) return; // chặn tua trong khi quảng cáo
            if (!isFinite(audio.duration)) return;
            const val = Number(e.target.value);
            elements.progress.setAttribute("aria-valuenow", String(val));
            audio.currentTime = (val / 100) * audio.duration;
            savePlayerState(true);
        });
    }

    // Điều khiển âm lượng
    if (elements.volume) {
    elements.volume.addEventListener("input", (e) => {
        const v = Number(e.target.value);
        audio.volume = v;
        elements.volume.setAttribute("aria-valuenow", String(v));

        // Cập nhật chỉ báo trực quan của thanh trượt âm lượng
        const percentage = (v / elements.volume.max) * 100;
        elements.volume.style.setProperty(
            "--volume-value",
            `${percentage}%`
        );

        // Cập nhật biểu tượng âm lượng bằng hàm chuyên dụng
        updateVolumeIcon(audio.volume);

        savePlayerState(true);
    });
}

    // Chuyển đổi âm lượng di động
    if (elements.volIcon) {
        setupMobileVolumeToggle();
    }
}

// ===== KHỞI TẠO PLAYER =====
/**
 * Khởi tạo module player
 * @param {Object} options - Tùy chọn khởi tạo
 * @returns {Object} Ngữ cảnh player với các phương thức công khai
 */
export function initPlayer(options = {}) {
    // Tạo phần tử audio
    audio = new Audio();
    safeExecute(() => {
        window.__mbAudio = audio;
        window.__mbLogoutInProgress = logoutInProgress;
    }, "initPlayer:exposeGlobals");

    // Lưu trữ các phần tử DOM
    elements = {
        titleEl: document.getElementById("title"),
        artistEl: document.getElementById("artist"),
        coverEl: document.getElementById("cover"),
        playBtn: document.getElementById("play"),
        playIcon: document.getElementById("play-icon"),
        prevBtn: document.getElementById("prev"),
        nextBtn: document.getElementById("next"),
        shuffleBtn: document.getElementById("shuffle"),
        repeatBtn: document.getElementById("repeat"),
        progress: document.getElementById("progress"),
        currentTimeEl: document.getElementById("current"),
        durationEl: document.getElementById("duration"),
        volume: document.getElementById("volume"),
        volIcon: document.getElementById("vol-icon"),
        queueListEl: document.getElementById("queue-list"),
        bTitle: document.getElementById("b-title"),
        bArtistName: document.getElementById("b-artist-name"),
        bCover: document.getElementById("b-cover"),
        bArtistAvatar: document.getElementById("b-artist-avatar"),
        ...options.elements,
    };

    // Thiết lập event listeners
    setupEventListeners();
    setupAdInteractionGuards();

    // Khởi tạo khả năng truy cập
    updateShuffleA11y();
    updateRepeatA11y();

    // Đặt thanh trượt âm lượng ban đầu
    updateVolumeSlider();

    // Lưu trạng thái trước khi trang được tải lại
    window.addEventListener("beforeunload", () => {
        savePlayerState(true);
    });

    // Tiết lộ API toàn cầu
    safeExecute(() => {
        window.MusicBox = Object.assign({}, window.MusicBox || {}, {
            playAt(trackIndex) {
                const playlist = window.__mbPlaylist || [];
                if (
                    typeof trackIndex === "number" &&
                    trackIndex >= 0 &&
                    trackIndex < playlist.length
                ) {
                    if (isAdPlaying) return;
                    loadTrack(trackIndex);
                    play();
                    if (window.__mbPushUIState) window.__mbPushUIState();
                    savePlayerState(true);
                }
            },
            currentIndex() {
                return index;
            },
            playlist() {
                return (window.__mbPlaylist || []).slice();
            },
            setPlaylist(tracks, context) {
                if (isAdPlaying) return;
                if (window.__mbSetPlaylist) {
                    const success = window.__mbSetPlaylist(tracks, context);
                    if (success) {
                        if (window.__mbRenderQueue) window.__mbRenderQueue();
                        loadTrack(0);
                        setPlayUI(false);
                        savePlayerState(true);
                    }
                }
            },
            pause() {
                pause();
                savePlayerState(true);
            },
            resume() {
                if (isAdPlaying) return;
                play();
                savePlayerState(true);
            },
            isPlaying() {
                return !!isPlaying;
            },
        });
    }, "initPlayer:exposeMusicBoxAPI");

    return {
        loadTrack,
        play,
        pause,
        nextTrack,
        prevTrack,
        savePlayerState,
        restorePlayerState,
        getSavedPlayerState,
        getCurrentIndex: () => index,
        isCurrentlyPlaying: () => isPlaying,
        getAudio: () => audio,
        updateVolumeSlider,
        updateVolumeIcon,
    };
}
