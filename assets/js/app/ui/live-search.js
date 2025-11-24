// ===== MODULE THẢ XUỐNG TÌM KIẾM TRỰC TIẾP =====

// ===== HẰNG SỐ CẤU HÌNH =====
const CONFIG = {
    SONGS_JSON_PATH: "./assets/music_data/songs.json", // Đường dẫn đến file JSON chứa danh sách bài hát
    SEARCH_DEBOUNCE_MS: 180, // Thời gian chờ (ms) trước khi thực hiện tìm kiếm sau khi người dùng gõ
    BLUR_HIDE_DELAY_MS: 150, // Thời gian chờ (ms) trước khi ẩn panel sau khi input mất focus
    MAX_RESULTS: 8, // Số kết quả tối đa hiển thị
    COMPACT_BREAKPOINT: 340, // Điểm ngắt để chuyển sang chế độ hiển thị thu gọn
    MIN_PANEL_WIDTH: 260, // Chiều rộng tối thiểu của panel kết quả
    DESIRED_MIN_WIDTH: 320, // Chiều rộng mong muốn tối thiểu của panel
    VIEWPORT_MARGIN: 8, // Khoảng cách lề từ viewport
    PANEL_GAP: 6, // Khoảng cách giữa input và panel
    MAX_Z_INDEX: "2147483647", // Giá trị z-index tối đa để panel luôn hiển thị trên cùng
    PANEL_ID: "mb-search-panel", // ID của panel tìm kiếm
    SEARCH_INPUT_ID: "search-input", // ID của ô input tìm kiếm
    SEARCH_WRAP_SELECTOR: ".search", // Selector cho phần tử bao quanh ô tìm kiếm
};

const STYLES = {
    COLORS: {
        PRIMARY: "#111827", // Màu chữ chính
        SECONDARY: "#6b7280", // Màu chữ phụ
        HOVER_BG: "#E0F2FE", // Màu nền khi hover
        HOVER_TEXT: "#135E88", // Màu chữ khi hover
        PLACEHOLDER: "#9ca3af", // Màu chữ placeholder
        COVER_BG: "#e5e7eb", // Màu nền cho ảnh bìa khi chưa tải
        PANEL_BG: "#ffffff", // Màu nền panel
        PANEL_BORDER: "rgba(0,0,0,.08)", // Màu viền panel
    },
    SIZES: {
        COMPACT: { gap: 8, padding: 8, cover: 32, fontSize: 11 }, // Kích thước cho chế độ thu gọn
        NORMAL: { gap: 10, padding: 10, cover: 36, fontSize: 12 }, // Kích thước cho chế độ bình thường
    },
};

// ===== HÀM TIỆN ÍCH =====
function normalizeText(text) {
    // Chuẩn hóa văn bản để tìm kiếm không dấu
    const str = String(text || "").trim();
    if (!str) return "";

    try {
        // Chuyển về dạng NFD, loại bỏ ký tự dấu, sau đó chuyển thành chữ thường
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    } catch {
        // Nếu có lỗi, chỉ chuyển về chữ thường
        return str.toLowerCase();
    }
}

function getViewportWidth() {
    // Lấy chiều rộng của viewport (trình duyệt hiển thị)
    return Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
    );
}

function escapeHtml(str) {
    // Chống tấn công XSS bằng cách escape các ký tự HTML đặc biệt
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

async function fetchSongsData() {
    // Lấy dữ liệu bài hát từ file JSON
    const response = await fetch(CONFIG.SONGS_JSON_PATH, {
        cache: "no-store", // Không sử dụng cache để luôn lấy dữ liệu mới nhất
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// ===== QUẢN LÝ DỮ LIỆU =====
class SongsCache {
    // Lớp quản lý cache danh sách bài hát
    constructor() {
        this.cache = null; // Cache lưu trữ danh sách bài hát
        this.loading = false; // Trạng thái đang tải
        this.hasError = false; // Trạng thái có lỗi
    }

    async load() {
        // Tải danh sách bài hát (với cache)
        if (this.cache || this.loading) {
            return this.cache || [];
        }

        this.loading = true;
        try {
            const data = await fetchSongsData();
            this.cache = Array.isArray(data) ? data : [];
            this.hasError = false;
        } catch (error) {
            console.error("Failed to load songs:", error);
            this.hasError = true;
            this.cache = [];
        } finally {
            this.loading = false;
        }

        return this.cache;
    }

    async reload() {
        // Tải lại danh sách bài hát (xóa cache cũ)
        this.cache = null;
        this.hasError = false;
        return this.load();
    }
}

// ===== QUẢN LÝ PANEL KẾT QUẢ =====
class SearchPanel {
    // Lớp quản lý panel hiển thị kết quả tìm kiếm
    constructor(searchWrap) {
        this.panel = this.createPanel(searchWrap);
        this.searchWrap = searchWrap;
    }

    createPanel(searchWrap) {
        // Tạo panel kết quả tìm kiếm
        const panel = document.createElement("div");
        panel.id = CONFIG.PANEL_ID;

        Object.assign(panel.style, {
            position: "fixed",
            top: "0px",
            left: "0px",
            background: STYLES.COLORS.PANEL_BG,
            border: `1px solid ${STYLES.COLORS.PANEL_BORDER}`,
            zIndex: CONFIG.MAX_Z_INDEX,
            display: "none",
            maxHeight: "60vh", // Chiều cao tối đa 60% viewport
            overflow: "auto", // Thêm thanh cuộn nếu nội dung vượt quá chiều cao
            borderRadius: "12px",
            boxShadow: "0 12px 28px rgba(0,0,0,.18)",
        });

        try {
            document.body.appendChild(panel);
        } catch {
            // Nếu không thể thêm vào body, thêm vào searchWrap
            searchWrap.appendChild(panel);
        }

        return panel;
    }

    calculatePosition() {
        // Tính toán vị trí và kích thước cho panel kết quả
        // Fix: panel tìm kiếm căn theo khung search bar, không căn theo ô input nhỏ
        const anchor =
            this.searchWrap ||
            document.querySelector(CONFIG.SEARCH_WRAP_SELECTOR);

        if (!anchor) {
            return this.getDefaultPosition();
        }

        const rect = anchor.getBoundingClientRect();
        const viewportWidth = getViewportWidth();

        // Sử dụng toàn bộ chiều rộng của container tìm kiếm
        const desiredWidth = Math.max(rect.width, CONFIG.DESIRED_MIN_WIDTH);
        const maxWidth = viewportWidth - CONFIG.VIEWPORT_MARGIN * 2;
        const width = Math.min(
            Math.max(desiredWidth, CONFIG.MIN_PANEL_WIDTH),
            maxWidth
        );

        // Panel sẽ được căn giữa so với ô input
        const left = Math.round(
            Math.max(
                CONFIG.VIEWPORT_MARGIN,
                Math.min(
                    rect.left,
                    viewportWidth - width - CONFIG.VIEWPORT_MARGIN
                )
            )
        );

        const top = Math.round(rect.bottom + CONFIG.PANEL_GAP);

        return {
            left,
            top,
            width: Math.round(width),
            maxWidth,
            isCompact: width < CONFIG.COMPACT_BREAKPOINT, // Kiểm tra xem có nên hiển thị ở chế độ thu gọn không
        };
    }

    getDefaultPosition() {
        // Trả về vị trí mặc định cho panel khi không tìm thấy anchor
        return {
            left: 0,
            top: 0,
            width: CONFIG.MIN_PANEL_WIDTH,
            maxWidth: CONFIG.MIN_PANEL_WIDTH,
            isCompact: true,
        };
    }

    updatePosition() {
        // Cập nhật vị trí và kích thước của panel
        const position = this.calculatePosition();

        this.panel.style.left = `${position.left}px`;
        this.panel.style.top = `${position.top}px`;
        this.panel.style.width = `${position.width}px`;
        this.panel.style.maxWidth = `${position.maxWidth}px`;
        this.panel.style.minWidth = `${CONFIG.MIN_PANEL_WIDTH}px`;
    }

    show() {
        // Hiển thị panel
        this.panel.style.display = "block";
        this.updatePosition();
    }

    hide() {
        // Ẩn panel
        this.panel.style.display = "none";
    }

    isVisible() {
        // Kiểm tra xem panel có đang hiển thị không
        return this.panel.style.display === "block";
    }

    render(items, query) {
        // Hiển thị kết quả tìm kiếm trong panel
        const hasQuery = Boolean(query);
        const hasResults = Array.isArray(items) && items.length > 0;

        if (!hasQuery || !hasResults) {
            // Nếu không có từ khóa hoặc không có kết quả
            this.panel.innerHTML = hasQuery
                ? `<div style="padding:10px 12px;color:${
                      STYLES.COLORS.PLACEHOLDER
                  }">Không tìm thấy "${escapeHtml(query)}".</div>`
                : "";

            hasQuery ? this.show() : this.hide();
            return;
        }

        const { isCompact } = this.calculatePosition();
        // Tạo HTML cho các kết quả tìm kiếm
        this.panel.innerHTML = items
            .map((song) => this.createResultItemHTML(song, isCompact))
            .join("");

        this.setupItemEvents();
        this.show();
    }

    createResultItemHTML(song, isCompact) {
        // Tạo HTML cho một mục kết quả tìm kiếm
        const sizes = isCompact ? STYLES.SIZES.COMPACT : STYLES.SIZES.NORMAL;
        const { gap, padding, cover: coverSize, fontSize } = sizes;
        const coverUrl = escapeHtml(song.cover || "");
        const songId = escapeHtml(song.id || "");
        const title = escapeHtml(song.title || "—");
        const artist = escapeHtml(song.artist || "—");

        return `
            <div class="sr-item" data-id="${songId}"
                 style="display:flex;align-items:center;gap:${gap}px;padding:${padding}px 12px;cursor:pointer;border-radius:10px">
                <div class="sr-cover"
                     style="width:${coverSize}px;height:${coverSize}px;border-radius:6px;background:${STYLES.COLORS.COVER_BG};background-image:url('${coverUrl}');background-size:cover;background-position:center"></div>
                <div class="sr-meta" style="display:flex;flex-direction:column;min-width:0">
                    <div class="sr-title" style="color:${STYLES.COLORS.PRIMARY};font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
                    <div class="sr-artist" style="color:${STYLES.COLORS.SECONDARY};font-size:${fontSize}px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${artist}</div>
                </div>
                <div class="sr-type" style="margin-left:auto;color:${STYLES.COLORS.SECONDARY};font-size:${fontSize}px">Bài hát</div>
            </div>
        `;
    }

    setupItemEvents() {
        // Thiết lập sự kiện cho các mục kết quả
        this.panel.querySelectorAll(".sr-item").forEach((item) => {
            this.setupHoverEffects(item);
            this.setupClickHandler(item);
        });
    }

    setupHoverEffects(item) {
        // Thiết lập hiệu ứng hover cho mục kết quả
        const elements = {
            title: item.querySelector(".sr-title"),
            artist: item.querySelector(".sr-artist"),
            type: item.querySelector(".sr-type"),
        };

        const applyHoverStyles = (isHover) => {
            // Áp dụng/loại bỏ hiệu ứng hover
            item.style.background = isHover
                ? STYLES.COLORS.HOVER_BG
                : "transparent";
            const textColor = isHover ? STYLES.COLORS.HOVER_TEXT : null;

            if (elements.title) {
                elements.title.style.color = textColor || STYLES.COLORS.PRIMARY;
            }
            if (elements.artist) {
                elements.artist.style.color =
                    textColor || STYLES.COLORS.SECONDARY;
            }
            if (elements.type) {
                elements.type.style.color =
                    textColor || STYLES.COLORS.SECONDARY;
            }
        };

        item.addEventListener("mouseenter", () => applyHoverStyles(true));
        item.addEventListener("mouseleave", () => applyHoverStyles(false));
    }

    setupClickHandler(item) {
        // Thiết lập xử lý sự kiện click cho mục kết quả
        item.addEventListener("click", async () => {
            try {
                const trackId = item.getAttribute("data-id");
                if (!trackId || !window.MusicBox) return;

                const { playAt, playlist, setPlaylist } = window.MusicBox;
                if (
                    typeof playAt !== "function" ||
                    typeof playlist !== "function"
                ) {
                    return;
                }

                let currentPlaylist = playlist();
                let trackIndex = Array.isArray(currentPlaylist)
                    ? currentPlaylist.findIndex(
                          (track) => track?.id === trackId
                      )
                    : -1;

                // Tải toàn bộ danh sách nếu bài hát không có trong playlist hiện tại
                if (trackIndex < 0 && typeof setPlaylist === "function") {
                    await this.loadFullCatalog();
                    currentPlaylist = playlist();
                    trackIndex = currentPlaylist.findIndex(
                        (track) => track?.id === trackId
                    );
                }

                if (trackIndex >= 0) {
                    // Phát bài hát và ẩn panel
                    playAt(trackIndex);
                    this.hide();
                }
            } catch (error) {
                console.error("Error handling item click:", error);
            }
        });
    }

    async loadFullCatalog() {
        // Tải toàn bộ danh sách bài hát
        try {
            const data = await fetchSongsData();
            if (
                Array.isArray(data) &&
                data.length > 0 &&
                window.MusicBox?.setPlaylist
            ) {
                window.MusicBox.setPlaylist(data, {
                    type: "global",
                    id: null,
                });
            }
        } catch (error) {
            console.error("Failed to load full catalog:", error);
        }
    }
}

// ===== CHỨC NĂNG TÌM KIẾM =====
class SearchEngine {
    // Lớp xử lý logic tìm kiếm
    constructor(songsCache) {
        this.songsCache = songsCache;
    }

    async search(query) {
        // Thực hiện tìm kiếm bài hát theo từ khóa
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return [];

        const songs = await this.songsCache.load();
        if (!Array.isArray(songs) || songs.length === 0) return [];

        // 1. Ưu tiên khớp từ đầu tên nghệ sĩ (starts with)
        const artistStartsWith = songs.filter((song) => {
            const normalizedArtist = normalizeText(song.artist);
            return normalizedArtist.startsWith(normalizedQuery);
        });

        // 2. Khớp từ đầu tên bài hát (starts with)
        const titleStartsWith = songs.filter((song) => {
            const normalizedTitle = normalizeText(song.title);
            const normalizedArtist = normalizeText(song.artist);
            return (
                normalizedTitle.startsWith(normalizedQuery) &&
                !normalizedArtist.startsWith(normalizedQuery)
            );
        });

        // 3. Khớp chứa trong tên nghệ sĩ (contains)
        const artistContains = songs.filter((song) => {
            const normalizedArtist = normalizeText(song.artist);
            return (
                normalizedArtist.includes(normalizedQuery) &&
                !normalizedArtist.startsWith(normalizedQuery)
            );
        });

        // 4. Khớp chứa trong tên bài hát (contains)
        const titleContains = songs.filter((song) => {
            const normalizedTitle = normalizeText(song.title);
            const normalizedArtist = normalizeText(song.artist);
            return (
                normalizedTitle.includes(normalizedQuery) &&
                !normalizedArtist.includes(normalizedQuery) &&
                !normalizedTitle.startsWith(normalizedQuery)
            );
        });

        // Trả về kết quả theo thứ tự ưu tiên và giới hạn số lượng
        return [
            ...artistStartsWith,
            ...titleStartsWith,
            ...artistContains,
            ...titleContains,
        ].slice(0, CONFIG.MAX_RESULTS);
    }
}

// ===== QUẢN LÝ SỰ KIỆN =====
class EventManager {
    // Lớp quản lý các sự kiện liên quan đến tìm kiếm
    constructor(input, panel, searchEngine, searchWrap) {
        this.input = input;
        this.panel = panel;
        this.searchEngine = searchEngine;
        this.searchWrap = searchWrap;
        this.searchTimer = null; // Timer cho debounce

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Thiết lập tất cả các sự kiện
        this.setupInputEvents();
        this.setupDocumentEvents();
        this.setupWindowEvents();
    }

    setupInputEvents() {
        // Thiết lập sự kiện cho ô input tìm kiếm
        
        // Sự kiện nhập liệu với debounce để tránh tìm kiếm quá nhiều lần
        this.input.addEventListener("input", () => {
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
            }
            this.searchTimer = setTimeout(() => {
                this.performSearch();
            }, CONFIG.SEARCH_DEBOUNCE_MS);
        });

        // Sự kiện bàn phím
        this.input.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                // Ẩn panel và mất focus khi nhấn Escape
                this.panel.hide();
                this.input.blur();
            }
        });

        // Xử lý focus/blur
        this.input.addEventListener("focus", () => {
            if (this.panel.isVisible()) {
                this.panel.updatePosition();
            }
        });

        this.input.addEventListener("blur", () => {
            // Ẩn panel sau một khoảng thời gian ngắn khi mất focus
            setTimeout(() => this.panel.hide(), CONFIG.BLUR_HIDE_DELAY_MS);
        });
    }

    setupDocumentEvents() {
        // Thiết lập sự kiện cho document
        
        // Click bên ngoài để đóng panel
        document.addEventListener("click", (event) => {
            const clickedInsideSearch = this.searchWrap?.contains(event.target);
            const clickedInsidePanel = this.panel.panel?.contains(event.target);

            if (!clickedInsideSearch && !clickedInsidePanel) {
                this.panel.hide();
            }
        });
    }

    setupWindowEvents() {
        // Thiết lập sự kiện cho window
        
        // Cập nhật lại vị trí panel khi cuộn hoặc thay đổi kích thước cửa sổ
        const repositionHandler = () => {
            if (this.panel.isVisible()) {
                this.panel.updatePosition();
            }
        };

        window.addEventListener("scroll", repositionHandler, { passive: true });
        window.addEventListener("resize", repositionHandler);
    }

    async performSearch() {
        // Thực hiện tìm kiếm và hiển thị kết quả
        const query = this.input.value || "";
        const results = await this.searchEngine.search(query);
        this.panel.render(results, query);
    }
}

// ===== HÀM THIẾT LẬP CHÍNH =====
export function setupGlobalLiveSearch({ playerContext }) {
    // Hàm khởi tạo chức năng tìm kiếm trực tiếp toàn cục
    const searchWrap = document.querySelector(CONFIG.SEARCH_WRAP_SELECTOR);
    if (!searchWrap) return;

    const input =
        document.getElementById(CONFIG.SEARCH_INPUT_ID) ||
        searchWrap.querySelector('input[type="search"]');
    if (!input) return;

    // Bỏ qua nếu panel đã tồn tại
    if (document.getElementById(CONFIG.PANEL_ID)) {
        return;
    }

    // Khởi tạo các thành phần
    const songsCache = new SongsCache(); // Cache danh sách bài hát
    const panel = new SearchPanel(searchWrap); // Panel hiển thị kết quả
    const searchEngine = new SearchEngine(songsCache); // Engine xử lý tìm kiếm
    const eventManager = new EventManager(
        input,
        panel,
        searchEngine,
        searchWrap
    ); // Quản lý sự kiện
}
