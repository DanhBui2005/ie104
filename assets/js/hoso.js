// Ẩn .main-content khi có .queue hiển thị trên trang
(function () {
    const SEARCH_SEL = ".main-content";
    const QUEUE_SEL = ".queue";
    const HIDE_CLASS = "is-hidden";

    // Thêm CSS ẩn nếu chưa có
    (function ensureHideClass() {
        if (document.getElementById("hide-timkiem-style")) return;
        const style = document.createElement("style");
        style.id = "hide-timkiem-style";
        style.textContent = `.${HIDE_CLASS}{ display:none !important; }`;
        document.head.appendChild(style);
    })();

    // ==== Tải lên và lưu trữ ảnh đại diện ====
    (function () {
        // Lấy key cho người dùng hiện tại để lưu ảnh đại diện
        function getUserKey() {
            try {
                const u = JSON.parse(
                    localStorage.getItem("auth_user") || "null"
                );
                if (u && (u.id || u.email)) return `avatar_${u.id || u.email}`;
            } catch {}
            return "avatar_guest";
        }

        const avatarEl = document.getElementById("user-avatar");
        const fileInput = document.getElementById("avatar-file");
        const removeBtn = document.getElementById("avatar-remove");
        if (!avatarEl || !fileInput) return;

        // Thêm CSS cho trạng thái khóa
        (function ensureAvatarLockStyle() {
            try {
                if (document.getElementById("avatar-lock-style")) return;
                const s = document.createElement("style");
                s.id = "avatar-lock-style";
                s.textContent = `.user-avatar.locked{cursor:not-allowed}`;
                document.head.appendChild(s);
            } catch {}
        })();

        // Khôi phục ảnh đại diện đã lưu
        try {
            const key = getUserKey();
            const dataUrl = localStorage.getItem(key);
            if (dataUrl) avatarEl.style.backgroundImage = `url('${dataUrl}')`;
        } catch {}

        // Kiểm tra xem ảnh đại diện đã được khóa (đã có ảnh) chưa
        function isLocked() {
            try {
                return !!localStorage.getItem(getUserKey());
            } catch {
                return false;
            }
        }
        
        // Đồng bộ trạng thái khóa của ảnh đại diện
        function syncLock() {
            try {
                const locked = isLocked();
                avatarEl.classList.toggle("locked", locked);
                avatarEl.setAttribute("aria-disabled", String(!!locked));
                if (locked)
                    avatarEl.setAttribute("title", "Đã có ảnh đại diện");
                else avatarEl.removeAttribute("title");
                if (removeBtn) {
                    removeBtn.disabled = !locked; // chỉ cho xóa khi đã có ảnh
                    // Ẩn hẳn nút xóa khi chưa có avatar để tránh gây hiểu nhầm
                    removeBtn.style.display = locked ? "" : "none";
                }
            } catch {}
        }
        syncLock();

        // Mở hộp thoại chọn file
        function openPicker() {
            try {
                if (isLocked()) return;
                // Reset giá trị input để chọn lại cùng một file vẫn kích hoạt change
                fileInput.value = "";
                fileInput.click();
            } catch {}
        }
        
        // Xử lý sự kiện click vào ảnh đại diện
        avatarEl.addEventListener("click", (e) => {
            if (isLocked()) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            openPicker();
        });
        
        // Xử lý sự kiện nhấn phím trên ảnh đại diện
        avatarEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (isLocked()) return;
                openPicker();
            }
        });

        // Xử lý khi người dùng chọn file ảnh
        fileInput.addEventListener("change", () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                if (typeof dataUrl === "string") {
                    avatarEl.style.backgroundImage = `url('${dataUrl}')`;
                    try {
                        localStorage.setItem(getUserKey(), dataUrl);
                    } catch {}
                    try {
                        window.dispatchEvent(new Event("avatar:changed"));
                    } catch {}
                    syncLock();
                }
            };
            reader.readAsDataURL(file);
        });

        // Xóa ảnh đại diện -> xóa storage và khôi phục mặc định
        function defaultAvatarUrl() {
            return "./assets/imgs/avatar.jpg";
        }
        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                const ok = window.confirm(
                    "Bạn có chắc muốn xóa ảnh đại diện không?"
                );
                if (!ok) return;
                try {
                    localStorage.removeItem(getUserKey());
                } catch {}
                try {
                    avatarEl.style.removeProperty("background-image");
                } catch {
                    avatarEl.style.backgroundImage = "";
                }
                try {
                    window.dispatchEvent(new Event("avatar:changed"));
                } catch {}
                syncLock();
            });
        }
    })();

    // ==== Chỉnh sửa tên hiển thị (lưu theo từng người dùng) ====
    (function () {
        // Lấy key cho người dùng hiện tại để lưu tên hiển thị
        function getNameKey() {
            try {
                const u = JSON.parse(
                    localStorage.getItem("auth_user") || "null"
                );
                if (u && (u.id || u.email))
                    return `displayname_${u.id || u.email}`;
            } catch {}
            return "displayname_guest";
        }

        const nameEl = document.getElementById("user-name");
        const inputEl = document.getElementById("user-name-input");
        const editBtn = document.getElementById("name-edit-btn");
        if (!nameEl || !inputEl || !editBtn) return;

        // Khôi phục tên đã lưu
        try {
            const saved = localStorage.getItem(getNameKey());
            if (saved && saved.trim()) {
                nameEl.textContent = saved;
                inputEl.value = saved;
            } else {
                // Nếu chưa có tên lưu, thử lấy từ thông tin người dùng hiện tại
                const currentUser = window.UserManager?.getCurrentUser();
                if (currentUser && currentUser.fullName) {
                    nameEl.textContent = currentUser.fullName;
                    inputEl.value = currentUser.fullName;
                    // Lưu vào localStorage để lần sau không cần lấy lại
                    localStorage.setItem(getNameKey(), currentUser.fullName);
                } else {
                    inputEl.value = nameEl.textContent.trim();
                }
            }
        } catch {
            // Fallback: thử lấy từ thông tin người dùng hiện tại
            try {
                const currentUser = window.UserManager?.getCurrentUser();
                if (currentUser && currentUser.fullName) {
                    nameEl.textContent = currentUser.fullName;
                    inputEl.value = currentUser.fullName;
                    localStorage.setItem(getNameKey(), currentUser.fullName);
                } else {
                    inputEl.value = nameEl.textContent.trim();
                }
            } catch {
                inputEl.value = nameEl.textContent.trim();
            }
        }

        // Bắt đầu chỉnh sửa tên
        function startEdit() {
            inputEl.value = nameEl.textContent.trim();
            inputEl.hidden = false;
            inputEl.focus();
            inputEl.select();
        }
        
        // Kết thúc chỉnh sửa tên
        function finishEdit(commit) {
            inputEl.hidden = true;
            if (!commit) return;
            let v = inputEl.value.trim().replace(/\s+/g, " ");
            inputEl.setCustomValidity("");
            // Validate: 2–40 ký tự, chỉ chữ/số/khoảng trắng
            const isLenOk = v.length >= 2 && v.length <= 40;
            const isCharsOk = /^([\p{L}\p{N}]+)([\p{L}\p{N}\s]*)$/u.test(v);
            if (!isLenOk || !isCharsOk) {
                inputEl.hidden = false;
                inputEl.setCustomValidity(
                    "Tên phải từ 2-40 ký tự, chỉ gồm chữ, số và khoảng trắng."
                );
                inputEl.reportValidity();
                inputEl.focus();
                inputEl.select();
                return;
            }
            nameEl.textContent = v;
            try {
                localStorage.setItem(getNameKey(), v);

                // Cập nhật tên trong thông tin người dùng hiện tại trong UserManager
                const currentUser = window.UserManager?.getCurrentUser();
                if (currentUser) {
                    currentUser.fullName = v;
                    // Cập nhật lại thông tin người dùng trong localStorage
                    const CURRENT_USER_KEY = "musicbox_current_user";
                    localStorage.setItem(
                        CURRENT_USER_KEY,
                        JSON.stringify(currentUser)
                    );

                    // Cập nhật cả firstName và lastName nếu có thể
                    const nameParts = v.split(" ");
                    if (nameParts.length > 1) {
                        currentUser.firstName = nameParts
                            .slice(0, -1)
                            .join(" ");
                        currentUser.lastName = nameParts[nameParts.length - 1];
                    } else {
                        currentUser.firstName = v;
                        currentUser.lastName = "";
                    }

                    // Lưu lại thông tin đã cập nhật
                    localStorage.setItem(
                        CURRENT_USER_KEY,
                        JSON.stringify(currentUser)
                    );
                }
            } catch {}
        }

        // Gán sự kiện cho các nút và input
        editBtn.addEventListener("click", startEdit);
        nameEl.addEventListener("click", startEdit);
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") finishEdit(true);
            else if (e.key === "Escape") finishEdit(false);
        });
        inputEl.addEventListener("blur", () => finishEdit(true));
    })();

    // ==== Hiển thị Playlist trong Hồ sơ (với nút 3 chấm và menu) ====
    (function () {
        // Chèn CSS cho menu playlist
        function injectPlaylistMenuStyle() {
            if (document.getElementById("playlist-menu-style")) return;
            const style = document.createElement("style");
            style.id = "playlist-menu-style";
            style.textContent = `
            .playlist-card, .my-pl-card { position: relative; }
            .playlist-menu-btn {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                border: none;
                color: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s ease, background 0.2s ease;
                z-index: 10;
            }
            .playlist-card:hover .playlist-menu-btn,
            .my-pl-card:hover .playlist-menu-btn,
            .playlist-menu-btn.menu-open {
                opacity: 1 !important;
            }
            .playlist-menu-btn:hover {
                background: rgba(0, 0, 0, 0.8);
                transform: scale(1.1);
            }
            .playlist-menu-popup {
                position: fixed;
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                padding: 4px;
                min-width: 190px;
                z-index: 10; /* Thấp hơn header (1100) và player (1000) */
            }
            [data-theme="dark"] .playlist-menu-popup {
                background: #1a2456;
                border: none;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            .playlist-menu-item {
                font-family: var(--font-family);
                width: 100%;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                min-height: 40px;
                line-height: 1;
                background: transparent;
                border: 0;
                color: #135e88;
                cursor: pointer;
                transition: all 0.15s ease;
                border-radius: 8px;
                position: relative;
            }
            [data-theme="dark"] .playlist-menu-item {
                color: #4a6cf7;
            }
            .playlist-menu-item:hover {
                background: #f5f9ff;
            }
            [data-theme="dark"] .playlist-menu-item:hover {
                background: rgba(74, 108, 247, 0.1);
            }
            .playlist-menu-item.delete {
                color: #ff5252;
            }
            [data-theme="dark"] .playlist-menu-item.delete {
                color: #ff6b9d;
            }
            .playlist-menu-item i {
                width: 24px;
                height: 24px;
                font-size: 1.2rem;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                color: inherit;
            }
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .modal-box {
                background: #fff;
                border-radius: 12px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            [data-theme="dark"] .modal-box {
                background: #1a2456;
                border: 1px solid #4a6cf7;
            }
            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin-bottom: 1rem;
                color: #333;
            }
            [data-theme="dark"] .modal-title {
                color: #e8eaed;
            }
            .modal-input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-bottom: 1rem;
                font-size: 1rem;
            }
            [data-theme="dark"] .modal-input {
                background: #0f1535;
                border-color: #4a6cf7;
                color: #e8eaed;
            }
            .modal-cover-preview {
                width: 100%;
                aspect-ratio: 1;
                border-radius: 8px;
                background-size: cover;
                background-position: center;
                margin-bottom: 1rem;
                border: 2px solid #ddd;
            }
            [data-theme="dark"] .modal-cover-preview {
                border-color: #4a6cf7;
            }
            .modal-actions {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
            }
            .modal-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            .modal-btn-primary {
                background: #4a6cf7;
                color: #fff;
            }
            .modal-btn-primary:hover {
                background: #3a5ce7;
                transform: translateY(-2px);
            }
            .modal-btn-secondary {
                background: #ddd;
                color: #333;
            }
            [data-theme="dark"] .modal-btn-secondary {
                background: #0f1535;
                color: #e8eaed;
            }
            .modal-btn-secondary:hover {
                background: #ccc;
            }
        `;
            document.head.appendChild(style);
        }

        // Chèn CSS khi trang tải
        console.log("[hoso.js] Injecting playlist menu style...");
        injectPlaylistMenuStyle();
        console.log("[hoso.js] Playlist menu style injected");

        // Lấy context playlist
        function getPlaylistContext() {
            try {
                // Nếu đã có playlistContext, trả về luôn
                if (
                    window.__mbContexts &&
                    window.__mbContexts.playlistContext
                ) {
                    return window.__mbContexts.playlistContext;
                }

                // Nếu chưa có, khởi tạo một context đơn giản
                console.log("[hoso.js] Creating fallback playlistContext");
                if (!window.__mbContexts) {
                    window.__mbContexts = {};
                }

                // Tạo context đơn giản để render playlist
                if (!window.__mbContexts.playlistContext) {
                    // Lấy playlist từ localStorage nếu có
                    const getUserPlaylists = () => {
                        try {
                            const saved =
                                localStorage.getItem("user_playlists_v1");
                            if (saved) {
                                return JSON.parse(saved);
                            }
                        } catch (err) {
                            console.error(
                                "[hoso.js] Error loading playlists:",
                                err
                            );
                        }
                        return [];
                    };

                    // Lưu playlist vào localStorage
                    const saveUserPlaylists = (lists) => {
                        try {
                            localStorage.setItem(
                                "user_playlists_v1",
                                JSON.stringify(lists)
                            );
                        } catch (err) {
                            console.error(
                                "[hoso.js] Error saving playlists:",
                                err
                            );
                        }
                    };

                    window.__mbContexts.playlistContext = {
                        getUserPlaylists,
                        updateUserPlaylist: (id, updates) => {
                            const lists = getUserPlaylists();
                            const idx = lists.findIndex((pl) => pl.id === id);
                            if (idx >= 0) {
                                lists[idx] = { ...lists[idx], ...updates };
                                saveUserPlaylists(lists);
                            }
                        },
                        deleteUserPlaylist: (id) => {
                            const lists = getUserPlaylists();
                            const idx = lists.findIndex((pl) => pl.id === id);
                            if (idx >= 0) {
                                lists.splice(idx, 1);
                                saveUserPlaylists(lists);
                            }
                        },
                    };
                }

                return window.__mbContexts.playlistContext;
            } catch (err) {
                console.error("[hoso.js] Error in getPlaylistContext:", err);
            }
            return null;
        }

        // Đóng menu đang mở
        let scrollRaf = null;
        let currentMenu = null;
        let currentButton = null;
        let scrollHandler = null;

        function closeMenu() {
            if (scrollRaf) {
                cancelAnimationFrame(scrollRaf);
                scrollRaf = null;
            }

            if (currentMenu) {
                // Xóa class menu-open khỏi nút
                if (currentButton) {
                    currentButton.classList.remove("menu-open");
                }

                currentMenu.remove();
                currentMenu = null;
                currentButton = null;

                // Xóa sự kiện scroll
                if (scrollHandler) {
                    window.removeEventListener("scroll", scrollHandler, {
                        capture: true,
                    });
                    scrollHandler = null;
                }
            }
        }

        // Hiển thị modal sửa tên playlist
        function showEditNameModal(pl, ctx) {
            closeMenu();
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
            <div class="modal-box">
                <h3 class="modal-title">Sửa tên playlist</h3>
                <input type="text" class="modal-input" value="${
                    pl.name || ""
                }" placeholder="Tên playlist" maxlength="40" />
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-secondary" data-action="cancel">Hủy</button>
                    <button class="modal-btn modal-btn-primary" data-action="save">Lưu</button>
                </div>
            </div>
        `;
            document.body.appendChild(overlay);

            const input = overlay.querySelector(".modal-input");
            input.focus();
            input.select();

            overlay.addEventListener("click", (e) => {
                if (
                    e.target === overlay ||
                    e.target.dataset.action === "cancel"
                ) {
                    overlay.remove();
                }
                if (e.target.dataset.action === "save") {
                    const newName = input.value.trim();
                    if (!newName || newName.length > 40) {
                        alert("Tên playlist phải từ 1-40 ký tự");
                        return;
                    }
                    ctx.updateUserPlaylist(pl.id, { name: newName });
                    overlay.remove();
                    window.dispatchEvent(new CustomEvent("playlists:changed"));
                }
            });
        }

        // Hiển thị modal đổi ảnh bìa playlist
        function showEditCoverModal(pl, ctx) {
            closeMenu();
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
            <div class="modal-box">
                <h3 class="modal-title">Đổi ảnh bìa</h3>
                <div class="modal-cover-preview" style="background-image: url('${
                    pl.cover ||
                    "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg"
                }')"></div>
                <input type="file" accept="image/*" style="display:none" id="cover-file-input" />
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-secondary" data-action="cancel">Hủy</button>
                    <button class="modal-btn modal-btn-secondary" data-action="choose">Chọn ảnh</button>
                    <button class="modal-btn modal-btn-primary" data-action="save">Lưu</button>
                </div>
            </div>
        `;
            document.body.appendChild(overlay);

            const preview = overlay.querySelector(".modal-cover-preview");
            const fileInput = overlay.querySelector("#cover-file-input");
            let newCover = pl.cover;

            fileInput.addEventListener("change", () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    newCover = reader.result;
                    preview.style.backgroundImage = `url('${newCover}')`;
                };
                reader.readAsDataURL(file);
            });

            overlay.addEventListener("click", (e) => {
                if (
                    e.target === overlay ||
                    e.target.dataset.action === "cancel"
                ) {
                    overlay.remove();
                }
                if (e.target.dataset.action === "choose") {
                    fileInput.click();
                }
                if (e.target.dataset.action === "save") {
                    ctx.updateUserPlaylist(pl.id, { cover: newCover });
                    overlay.remove();
                    window.dispatchEvent(new CustomEvent("playlists:changed"));
                }
            });
        }

        // Hiển thị xác nhận xóa playlist
        function showDeleteModal(pl, ctx) {
            closeMenu();
            const ok = window.confirm(
                `Bạn có chắc muốn xóa playlist "${pl.name}"?`
            );
            if (ok) {
                ctx.deleteUserPlaylist(pl.id);
                window.dispatchEvent(new CustomEvent("playlists:changed"));
            }
        }

        // Hiển thị menu playlist
        function showPlaylistMenu(e, pl, ctx) {
            e.stopPropagation();
            closeMenu();

            // Lưu tham chiếu đến nút đã mở menu và thêm class menu-open
            currentButton = e.target.closest(".playlist-menu-btn");
            if (currentButton) {
                currentButton.classList.add("menu-open");
            }

            const menu = document.createElement("div");
            menu.className = "playlist-menu-popup";
            menu.innerHTML = `
            <button class="playlist-menu-item" data-action="edit-name">
                <i class="fa-solid fa-pencil"></i>
                <span>Sửa tên</span>
            </button>
            <button class="playlist-menu-item" data-action="edit-cover">
                <i class="fa-regular fa-image"></i>
                <span>Đổi ảnh bìa</span>
            </button>
            <button class="playlist-menu-item delete" data-action="delete">
                <i class="fa-regular fa-trash-can"></i>
                <span>Xóa playlist</span>
            </button>
        `;

            document.body.appendChild(menu);
            currentMenu = menu;

            // Hàm cập nhật vị trí menu dựa trên vị trí nút
            function updateMenuPosition() {
                if (!currentButton || !currentMenu) return;

                const btnRect = currentButton.getBoundingClientRect();
                const menuRect = currentMenu.getBoundingClientRect();
                const headerHeight =
                    document.querySelector(".header")?.offsetHeight || 60;
                const playerHeight =
                    document.querySelector(".player")?.offsetHeight || 80;
                const viewportHeight = window.innerHeight;

                // Tính toán không gian có sẵn
                const spaceAbove = btnRect.top - headerHeight;
                const spaceBelow =
                    viewportHeight - btnRect.bottom - playerHeight;

                // Đặt menu dưới nút theo mặc định
                let top = btnRect.bottom;

                // Nếu không đủ không gian bên dưới nhưng có nhiều không gian bên trên, hiển thị bên trên
                if (spaceBelow < menuRect.height && spaceAbove > spaceBelow) {
                    top = btnRect.top - menuRect.height;
                }

                // Đảm bảo menu nằm trong viewport
                top = Math.max(
                    headerHeight,
                    Math.min(
                        top,
                        viewportHeight - playerHeight - menuRect.height
                    )
                );

                // Áp dụng vị trí
                currentMenu.style.position = "fixed";
                currentMenu.style.top = `${top}px`;
                currentMenu.style.left = `${Math.max(
                    10,
                    Math.min(
                        btnRect.left,
                        window.innerWidth - menuRect.width - 10
                    )
                )}px`;
            }

            // Định vị ban đầu
            updateMenuPosition();

            // Thêm sự kiện scroll để cập nhật vị trí khi cuộn
            scrollHandler = function () {
                // Sử dụng requestAnimationFrame để tối ưu hiệu suất
                if (!scrollRaf) {
                    scrollRaf = requestAnimationFrame(() => {
                        updateMenuPosition();
                        scrollRaf = null;
                    });
                }
            };

            // Thêm sự kiện scroll với capture: true để đảm bảo bắt được sự kiện
            window.addEventListener("scroll", scrollHandler, {
                passive: true,
                capture: true,
            });

            // Cũng cập nhật khi thay đổi kích thước cửa sổ
            const resizeHandler = () => {
                updateMenuPosition();
                window.addEventListener("resize", resizeHandler, {
                    once: true,
                });
            };

            window.addEventListener("resize", resizeHandler, { once: true });

            // Đảm bảo menu được cập nhật vị trí sau khi hiển thị
            requestAnimationFrame(updateMenuPosition);

            // Xử lý các hành động menu
            menu.addEventListener("click", (ev) => {
                const action =
                    ev.target.closest("[data-action]")?.dataset.action;
                if (action === "edit-name") {
                    showEditNameModal(pl, ctx);
                } else if (action === "edit-cover") {
                    showEditCoverModal(pl, ctx);
                } else if (action === "delete") {
                    showDeleteModal(pl, ctx);
                }
            });

            // Đóng menu khi click bên ngoài
            setTimeout(() => {
                const outsideClickHandler = function (evt) {
                    // Kiểm tra xem click có phải là trên menu hoặc nút 3 chấm không
                    if (
                        currentMenu &&
                        !currentMenu.contains(evt.target) &&
                        (!currentButton || !currentButton.contains(evt.target))
                    ) {
                        closeMenu();
                    }
                };

                document.addEventListener("click", outsideClickHandler, {
                    once: true,
                });
            }, 0);
        }

        // Hàm hiển thị các playlist trong hồ sơ
        function renderProfilePlaylists() {
            console.log("[hoso.js] Rendering profile playlists...");
            // Tìm container chứa playlist
            const container = document.querySelector(".my-playlists");
            console.log("[hoso.js] Container found:", container);
            if (!container) {
                console.error("[hoso.js] Container not found!");
                return;
            }

            const ctx = getPlaylistContext();
            console.log("[hoso.js] PlaylistContext:", ctx);
            if (!ctx) {
                container.innerHTML =
                    '<p style="color: var(--text-secondary); padding: 2rem; text-align: center;">Không thể tải playlists</p>';
                return;
            }

            try {
                let lists = ctx.getUserPlaylists();
                console.log("[hoso.js] Playlists:", lists);

                // Nếu không có playlist nào, tạo một số playlist mẫu để test
                if (!Array.isArray(lists) || lists.length === 0) {
                    console.log(
                        "[hoso.js] Creating sample playlists for testing"
                    );
                    lists = [
                        {
                            id: "pl1",
                            name: "My Chill Mix",
                            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg",
                            tracks: Array(5)
                                .fill()
                                .map((_, i) => "song" + i),
                        },
                        {
                            id: "pl2",
                            name: "Suy tí thôi",
                            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_2.jpg",
                            tracks: Array(3)
                                .fill()
                                .map((_, i) => "song" + (i + 5)),
                        },
                        {
                            id: "pl3",
                            name: "Tự hào Việt Nam",
                            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_3.jpg",
                            tracks: Array(4)
                                .fill()
                                .map((_, i) => "song" + (i + 8)),
                        },
                    ];

                    // Lưu vào localStorage
                    try {
                        localStorage.setItem(
                            "user_playlists_v1",
                            JSON.stringify(lists)
                        );
                    } catch (err) {
                        console.error(
                            "[hoso.js] Error saving sample playlists:",
                            err
                        );
                    }
                }

                // Cập nhật tiêu đề phần với số lượng playlist
                const titleEl = document.querySelector(".section-title");
                if (titleEl) {
                    titleEl.textContent = `Playlist đã tạo (${lists.length})`;
                }

                if (!Array.isArray(lists) || lists.length === 0) {
                    container.innerHTML =
                        '<p style="color: var(--text-secondary); padding: 2rem; text-align: center;">Bạn chưa tạo playlist nào<br><small style="opacity: 0.7;">Nhấn nút "+" ở sidebar để tạo playlist mới</small></p>';
                    return;
                }

                // Xóa HTML tĩnh trước khi render
                container.innerHTML = "";
                lists.forEach((pl) => {
                    const card = document.createElement("div");
                    card.className = "my-pl-card";
                    card.innerHTML = `
                    <button class="playlist-menu-btn" title="Tùy chọn" aria-label="Tùy chọn playlist">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>
                    <div class="my-pl-cover" style="background-image: url('${
                        pl.cover ||
                        "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg"
                    }');"></div>
                    <div class="my-pl-name" title="${pl.name || "Playlist"}">${
                        pl.name || "Playlist"
                    }</div>
                    <div class="my-pl-sub">${
                        pl.tracks?.length || 0
                    } bài hát</div>
                `;

                    // Nút menu
                    const menuBtn = card.querySelector(".playlist-menu-btn");
                    menuBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        showPlaylistMenu(e, pl, ctx);
                    });

                    // Click để mở playlist
                    card.addEventListener("click", (e) => {
                        if (e.target.closest(".playlist-menu-btn")) return;
                        try {
                            const go =
                                window.__mbGo ||
                                ((url) => {
                                    window.location.href = url;
                                });
                            go(
                                `./playlist.html?id=${encodeURIComponent(
                                    pl.id
                                )}`
                            );
                        } catch {
                            window.location.href = `./playlist.html?id=${encodeURIComponent(
                                pl.id
                            )}`;
                        }
                    });

                    container.appendChild(card);
                });
            } catch (err) {
                console.error("[hoso] Error rendering playlists:", err);
                container.innerHTML =
                    '<p style="color: var(--text-secondary); padding: 2rem; text-align: center;">Lỗi khi tải playlists</p>';
            }
        }

        // Thêm nút 3 chấm vào mỗi playlist nếu chưa có
        function addThreeDotsToExistingPlaylists() {
            console.log("[hoso.js] Adding three dots to existing playlists...");
            const cards = document.querySelectorAll(".my-pl-card");
            cards.forEach((card) => {
                // Kiểm tra xem đã có nút 3 chấm chưa
                if (!card.querySelector(".playlist-menu-btn")) {
                    console.log(
                        "[hoso.js] Adding three dots button to playlist card"
                    );
                    const btn = document.createElement("button");
                    btn.className = "playlist-menu-btn";
                    btn.title = "Tùy chọn";
                    btn.setAttribute("aria-label", "Tùy chọn playlist");
                    btn.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
                    card.appendChild(btn);

                    // Thêm sự kiện click
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        // Lấy thông tin playlist từ card
                        const name =
                            card.querySelector(".my-pl-name")?.textContent ||
                            "Playlist";
                        const cover =
                            card
                                .querySelector(".my-pl-cover")
                                ?.style.backgroundImage.replace(
                                    /url\(['"](.*?)['"]\)/i,
                                    "$1"
                                ) || "";
                        const pl = {
                            id:
                                card.dataset.id ||
                                "pl" +
                                    Math.random().toString(36).substring(2, 9),
                            name,
                            cover,
                        };
                        const ctx = getPlaylistContext();
                        if (ctx) {
                            showPlaylistMenu(e, pl, ctx);
                        }
                    });
                }
            });
        }

        // Render ban đầu
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                renderProfilePlaylists();
                // Thêm nút 3 chấm vào các playlist hiện có nếu renderProfilePlaylists không chạy
                setTimeout(addThreeDotsToExistingPlaylists, 500);
            });
        } else {
            renderProfilePlaylists();
            // Thêm nút 3 chấm vào các playlist hiện có nếu renderProfilePlaylists không chạy
            setTimeout(addThreeDotsToExistingPlaylists, 500);
        }

        // Render lại khi playlist thay đổi
        window.addEventListener("playlists:changed", renderProfilePlaylists);
    })();

    // Helper: kiểm tra phần tử có "đang hiển thị" không
    function isVisible(el) {
        if (!el || el.hidden) return false;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // Đồng bộ trạng thái ẩn/hiện
    function sync() {
        const searchEl = document.querySelector(SEARCH_SEL);
        if (!searchEl) return;
        const queues = Array.from(document.querySelectorAll(QUEUE_SEL));
        const anyQueueVisible = queues.some(isVisible);
        searchEl.classList.toggle(HIDE_CLASS, anyQueueVisible);
    }

    // Debounce nhẹ bằng rAF để tránh chạy quá dày
    let rafId = 0;
    const scheduleSync = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            sync();
        });
    };

    // Bắt đầu: chạy 1 lần + theo dõi thay đổi DOM/thuộc tính
    function start() {
        sync();
        new MutationObserver(scheduleSync).observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "hidden"],
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
