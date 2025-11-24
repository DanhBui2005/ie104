// assets/js/user-manager.js
// Quản lý người dùng: đăng ký, đăng nhập, lưu trữ

(function () {
    "use strict";

    // Khóa lưu trữ trong localStorage
    const USERS_KEY = "musicbox_users";
    const CURRENT_USER_KEY = "musicbox_current_user";

    // Hàm lấy danh sách người dùng từ localStorage
    function getUsers() {
        try {
            const users = localStorage.getItem(USERS_KEY);
            return users ? JSON.parse(users) : [];
        } catch (error) {
            console.error("Lỗi khi lấy danh sách người dùng:", error);
            return [];
        }
    }

    // Hàm lưu danh sách người dùng vào localStorage
    function saveUsers(users) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            return true;
        } catch (error) {
            console.error("Lỗi khi lưu danh sách người dùng:", error);
            return false;
        }
    }

    // Hàm tạo người dùng mới
    function createUser(userData) {
        const users = getUsers();

        // Kiểm tra email đã tồn tại chưa
        if (users.some((user) => user.email === userData.email)) {
            return { success: false, message: "Email này đã được đăng ký!" };
        }

        // Tạo đối tượng người dùng mới
        const newUser = {
            id: Date.now().toString(), // ID đơn giản dựa trên timestamp
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            password: userData.password, // Trong thực tế nên hash password
            gender: userData.gender,
            dob: userData.dob,
            createdAt: new Date().toISOString(),
        };

        // Thêm vào danh sách
        users.push(newUser);

        // Lưu vào localStorage
        if (saveUsers(users)) {
            return {
                success: true,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                },
            };
        } else {
            return {
                success: false,
                message: "Lỗi khi lưu thông tin người dùng!",
            };
        }
    }

    // Hàm đăng nhập người dùng
    function loginUser(email, password) {
        const users = getUsers();
        const user = users.find(
            (u) => u.email === email && u.password === password
        );

        if (user) {
            // Kiểm tra xem có tên hiển thị tùy chỉnh nào trong localStorage không
            const displayNameKey = `displayname_${user.id || user.email}`;
            let savedDisplayName = null;
            try {
                savedDisplayName = localStorage.getItem(displayNameKey);
            } catch (error) {
                console.error("Lỗi khi lấy tên hiển thị đã lưu:", error);
            }

            // Lưu thông tin người dùng hiện tại (không bao gồm password)
            const currentUser = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName:
                    savedDisplayName && savedDisplayName.trim()
                        ? savedDisplayName.trim()
                        : `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                dob: user.dob,
            };

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

            // Lưu tên đầy đủ vào auth_user để sử dụng trong hồ sơ
            try {
                localStorage.setItem(
                    "auth_user",
                    JSON.stringify({
                        id: user.id,
                        email: user.email,
                    })
                );

                // Nếu chưa có tên hiển thị, lưu tên đầy đủ vào localStorage
                if (!savedDisplayName) {
                    localStorage.setItem(displayNameKey, currentUser.fullName);
                }
            } catch (error) {
                console.error("Lỗi khi lưu tên hiển thị người dùng:", error);
            }

            return { success: true, user: currentUser };
        } else {
            return {
                success: false,
                message: "Email hoặc mật khẩu không đúng!",
            };
        }
    }

    // Hàm lấy thông tin người dùng hiện tại
    function getCurrentUser() {
        try {
            const user = localStorage.getItem(CURRENT_USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error("Lỗi khi lấy thông tin người dùng hiện tại:", error);
            return null;
        }
    }

    // Hàm đăng xuất
    function logoutUser() {
        try {
            localStorage.removeItem(CURRENT_USER_KEY);
            return true;
        } catch (error) {
            console.error("Lỗi trong quá trình đăng xuất:", error);
            return false;
        }
    }

    // Hàm kiểm tra đã đăng nhập chưa
    function isLoggedIn() {
        return getCurrentUser() !== null;
    }

    // Export các hàm ra ngoài
    window.UserManager = {
        createUser,
        loginUser,
        getCurrentUser,
        logoutUser,
        isLoggedIn,
    };
})();
