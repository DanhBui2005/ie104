// ===== MODULE TÌM KIẾM HEADER =====

// ===== HẰNG SỐ =====
const SONGS_JSON_PATH = "./assets/music_data/songs.json"; // Đường dẫn đến file JSON chứa danh sách bài hát
const SEARCH_PAGE_PATH = "./timkiem.html"; // Đường dẫn đến trang kết quả tìm kiếm

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
 * Chuẩn hóa văn bản để tìm kiếm (loại bỏ dấu)
 * @param {string} text - Văn bản cần chuẩn hóa
 * @returns {string} Văn bản đã chuẩn hóa
 */
function normalizeSearchText(text) {
    return (
        safeExecute(() => {
            return String(text || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();
        }, "normalizeSearchText") ??
        String(text || "")
            .toLowerCase()
            .trim()
    );
}

/**
 * Cấu hình thuộc tính cho ô input tìm kiếm
 * @param {HTMLElement} input - Phần tử input tìm kiếm
 */
function configureSearchInput(input) {
    input.setAttribute("autocomplete", "off"); // Tắt tự động hoàn thành
    input.setAttribute("autocorrect", "off"); // Tắt tự động sửa lỗi
    input.setAttribute("autocapitalize", "off"); // Tắt tự động viết hoa
    input.setAttribute("spellcheck", "false"); // Tắt kiểm tra chính tả
}

/**
 * Tải dữ liệu bài hát từ file JSON
 * @returns {Promise<Array>} Mảng các bài hát
 */
async function loadSongsData() {
    return (
        safeExecute(async () => {
            const response = await fetch(SONGS_JSON_PATH, {
                cache: "no-store", // Không sử dụng cache để luôn lấy dữ liệu mới nhất
            });
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        }, "loadSongsData") ?? []
    );
}

/**
 * Tìm bài hát hoặc nghệ sĩ khớp với từ khóa
 * @param {Array} songs - Mảng các bài hát
 * @param {string} normalizedQuery - Từ khóa tìm kiếm đã chuẩn hóa
 * @returns {Object|null} Kết quả khớp với loại và mục tiêu
 */
function findMatch(songs, normalizedQuery) {
    if (!Array.isArray(songs) || songs.length === 0) {
        return null;
    }

    // 1. Thử khớp chính xác tên nghệ sĩ trước (ưu tiên)
    const exactArtistMatch = songs.find(
        (song) => normalizeSearchText(song.artist) === normalizedQuery
    );

    if (exactArtistMatch) {
        return { type: "artist", target: exactArtistMatch.artist };
    }

    // 2. Thử tên nghệ sĩ bắt đầu bằng từ khóa
    const artistStartsWith = songs.find((song) =>
        normalizeSearchText(song.artist).startsWith(normalizedQuery)
    );

    if (artistStartsWith) {
        return { type: "artist", target: artistStartsWith.artist };
    }

    // 3. Thử khớp chính xác tên bài hát
    const exactSongMatch = songs.find(
        (song) => normalizeSearchText(song.title) === normalizedQuery
    );

    if (exactSongMatch) {
        return { type: "song", target: exactSongMatch.artist };
    }

    // 4. Thử tên bài hát bắt đầu bằng từ khóa
    const titleStartsWith = songs.find((song) =>
        normalizeSearchText(song.title).startsWith(normalizedQuery)
    );

    if (titleStartsWith) {
        return { type: "song", target: titleStartsWith.artist };
    }

    // 5. Thử khớp một phần tên nghệ sĩ (chứa)
    const partialArtistMatch = songs.find((song) =>
        normalizeSearchText(song.artist).includes(normalizedQuery)
    );

    if (partialArtistMatch) {
        return { type: "artist", target: partialArtistMatch.artist };
    }

    // 6. Thử khớp một phần tên bài hát (chứa)
    const partialSongMatch = songs.find((song) =>
        normalizeSearchText(song.title).includes(normalizedQuery)
    );

    if (partialSongMatch) {
        return { type: "song", target: partialSongMatch.artist };
    }

    return null;
}

/**
 * Xác định mục tiêu tìm kiếm (từ khóa gốc hoặc nghệ sĩ nếu tìm thấy bài hát/nghệ sĩ)
 * @param {string} query - Từ khóa tìm kiếm gốc
 * @returns {Promise<string>} Mục tiêu tìm kiếm
 */
async function determineSearchTarget(query) {
    const normalizedQuery = normalizeSearchText(query);

    if (normalizedQuery.length === 0) {
        return query;
    }

    const songs = await loadSongsData();
    const match = findMatch(songs, normalizedQuery);

    // Nếu tìm thấy bài hát hoặc nghệ sĩ, tìm kiếm theo nghệ sĩ
    if (match?.target) {
        return match.target;
    }

    // Ngược lại, sử dụng từ khóa gốc
    return query;
}

/**
 * Điều hướng đến trang kết quả tìm kiếm
 * @param {Function} go - Hàm điều hướng
 * @param {string} query - Từ khóa tìm kiếm
 */
function navigateToSearch(go, query) {
    const searchUrl = `${SEARCH_PAGE_PATH}?q=${encodeURIComponent(query)}`;
    go(searchUrl);
}

/**
 * Xử lý khi người dùng nhấn phím Enter trong ô tìm kiếm
 * @param {KeyboardEvent} event - Sự kiện bàn phím
 * @param {HTMLElement} input - Phần tử input tìm kiếm
 * @param {Function} go - Hàm điều hướng
 */
async function handleSearchSubmit(event, input, go) {
    if (event.key !== "Enter") return;

    const query = input.value || "";
    if (query.trim().length === 0) return;

    const searchTarget = await determineSearchTarget(query);
    navigateToSearch(go, searchTarget);
}

// ===== THIẾT LẬP CHÍNH =====
/**
 * Thiết lập chức năng tìm kiếm ở header
 * @param {Object} options - Tùy chọn thiết lập
 * @param {Function} options.go - Hàm điều hướng
 */
export function setupHeaderSearch({ go }) {
    const searchInput = document.querySelector('.search input[type="search"]');
    if (!searchInput) return;

    configureSearchInput(searchInput);

    searchInput.addEventListener("keydown", async (event) => {
        await handleSearchSubmit(event, searchInput, go);
    });
}
