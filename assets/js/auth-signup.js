// Signup page logic (standalone)
(function () {
    const q = (id) => document.getElementById(id);
    const form = q("form-signup");
    const err = q("su-error");
    const emailErr = q("email-error");
    const success = q("su-success");
    const submitBtn = q("btn-signup");

    const fields = [
        q("su-first"),
        q("su-last"),
        q("su-gender"),
        q("su-dob"),
        q("su-email"),
        q("su-phone"),
        q("su-pass"),
        q("su-repass"),
    ];
    const terms = q("su-terms");

    const mark = (el, bad) => el.classList.toggle("invalid", !!bad);

    // Hàm kiểm tra định dạng email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        let bad = false;

        success.hidden = true;
        fields.forEach((el) => {
            const v = (el.value || "").toString().trim();
            if (!v) {
                mark(el, true);
                bad = true;
            } else mark(el, false);
        });
        if (!terms.checked) bad = true;

        // kiểm tra định dạng email
        const emailField = q("su-email");
        const emailValue = (emailField.value || "").toString().trim();
        if (emailValue && !isValidEmail(emailValue)) {
            mark(emailField, true);
            emailErr.hidden = false;
            return;
        } else {
            emailErr.hidden = true;
        }

        // mật khẩu khớp?
        if (!bad && q("su-pass").value !== q("su-repass").value) {
            mark(q("su-pass"), true);
            mark(q("su-repass"), true);
            err.textContent = "Mật khẩu nhập lại không khớp";
            err.hidden = false;
            return;
        }

        err.textContent = "Vui lòng điền đầy đủ thông tin";
        err.hidden = !bad;
        if (bad) return;

        // Lưu thông tin người dùng
        const userData = {
            firstName: q("su-first").value.trim(),
            lastName: q("su-last").value.trim(),
            gender: q("su-gender").value,
            dob: q("su-dob").value,
            email: q("su-email").value.trim(),
            phone: q("su-phone").value.trim(),
            password: q("su-pass").value,
        };

        // Tạo người dùng mới thông qua UserManager
        if (window.UserManager) {
            const result = window.UserManager.createUser(userData);

            if (result.success) {
                err.hidden = true;
                success.textContent =
                    "Đăng ký thành công! Đang chuyển đến trang đăng nhập...";
                success.hidden = false;

                // Lưu tên đầy đủ vào localStorage để sử dụng trong hồ sơ
                try {
                    const fullName = `${q("su-first").value.trim()} ${q(
                        "su-last"
                    ).value.trim()}`.trim();
                    const displayNameKey = `displayname_${
                        result.user.id || result.user.email
                    }`;
                    localStorage.setItem(displayNameKey, fullName);

                    // Cũng lưu vào auth_user để hoso.js có thể truy cập
                    localStorage.setItem(
                        "auth_user",
                        JSON.stringify({
                            id: result.user.id,
                            email: result.user.email,
                        })
                    );
                } catch (error) {
                    console.error(
                        "Error saving user display name after signup:",
                        error
                    );
                }

                submitBtn.setAttribute("disabled", "true");
                submitBtn.setAttribute("aria-busy", "true");

                const params = new URLSearchParams(location.search);
                const next = params.get("next");
                const redirectUrl = next
                    ? `./login.html?next=${encodeURIComponent(next)}`
                    : "./login.html";
                setTimeout(() => {
                    location.replace(redirectUrl);
                }, 1500);
            } else {
                err.textContent = result.message;
                err.hidden = false;
            }
        } else {
            // Fallback nếu UserManager chưa tải
            err.textContent = "Lỗi hệ thống. Vui lòng tải lại trang.";
            err.hidden = false;
        }
    });

    fields.forEach((el) =>
        el.addEventListener("blur", () => {
            if ((el.value || "").toString().trim())
                el.classList.remove("invalid");
        })
    );

    // Real-time validation cho email
    const emailField = q("su-email");
    emailField.addEventListener("input", () => {
        const emailValue = (emailField.value || "").toString().trim();
        if (emailValue && !isValidEmail(emailValue)) {
            mark(emailField, true);
            emailErr.hidden = false;
        } else {
            mark(emailField, false);
            emailErr.hidden = true;
        }
    });

    // Ẩn thông báo lỗi email khi người dùng focus vào trường
    emailField.addEventListener("focus", () => {
        emailErr.hidden = true;
    });

    // ===== Hiệu ứng cho nút OAuth (Google / Facebook) =====
    const oauthButtons = document.querySelectorAll(".oauth-btn");
    oauthButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("loading")) return;
            btn.classList.add("loading");
            btn.setAttribute("aria-busy", "true");
            btn.setAttribute("disabled", "true");
            setTimeout(() => {
                btn.classList.remove("loading");
                btn.removeAttribute("aria-busy");
                btn.removeAttribute("disabled");
            }, 1200);
        });
    });

    // Password visibility toggles
    function setupPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);

        if (toggle && input) {
            toggle.addEventListener("click", function () {
                const type =
                    input.getAttribute("type") === "password"
                        ? "text"
                        : "password";
                input.setAttribute("type", type);

                // Toggle the visibility class
                this.classList.toggle("visible");

                // Update aria-label
                if (type === "text") {
                    this.setAttribute("aria-label", "Ẩn mật khẩu");
                } else {
                    this.setAttribute("aria-label", "Hiển thị mật khẩu");
                }
            });
        }
    }

    // Setup toggles for both password fields
    setupPasswordToggle("su-pass-toggle", "su-pass");
    setupPasswordToggle("su-repass-toggle", "su-repass");
})();
