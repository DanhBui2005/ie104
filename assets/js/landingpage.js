"use strict";

// Hàm chính thực thi khi trang được tải
(function () {
    // Lấy các phần tử burger menu và menu mobile
    var burger = document.querySelector("[data-burger]");
    var mobile = document.querySelector("[data-mobile]");
    
    // Xử lý sự kiện click vào burger menu để mở/đóng menu mobile
    if (burger && mobile) {
        burger.addEventListener("click", function () {
            mobile.classList.toggle("open");
        });
        
        // Xử lý sự kiện click vào các liên kết trong menu mobile để đóng menu
        mobile.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () {
                mobile.classList.remove("open");
            });
        });
    }

    // Xử lý sự kiện click cho các liên kết anchor (#) để cuộn mượt đến phần tương ứng
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener("click", function (e) {
            // Lấy ID của phần tử mục tiêu từ href
            var targetId = this.getAttribute("href");
            if (!targetId || targetId === "#") return;
            
            // Tìm phần tử mục tiêu trong trang
            var el = document.querySelector(targetId);
            if (el) {
                e.preventDefault();
                
                // Tính toán vị trí cuộn chính xác, trừ đi chiều cao header và thêm padding
                var headerHeight =
                    document.querySelector(".header").offsetHeight;
                var elementPosition = el.getBoundingClientRect().top;
                var offsetPosition =
                    elementPosition + window.pageYOffset - headerHeight - 20; // Thêm 20px padding

                // Cuộn mượt đến vị trí đã tính toán
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });
            }
        });
    });

    // Lấy các nút hành động (Call-to-Action)
    var signupBtn = document.querySelector("[data-cta-signup]");
    var demoBtn = document.querySelector("[data-cta-demo]");

    console.log("Buttons found:", signupBtn, demoBtn);

    // Xử lý sự kiện click cho nút đăng ký
    if (signupBtn) {
        signupBtn.addEventListener("click", function (e) {
            console.log("CTA: Đăng ký miễn phí clicked");
            // Anchor tag sẽ tự động điều hướng, nhưng có thể thêm tracking ở đây
        });
    }
    
    // Xử lý sự kiện click cho nút xem demo
    if (demoBtn) {
        demoBtn.addEventListener("click", function (e) {
            console.log("CTA: Xem demo clicked");
            e.preventDefault();
            // Hiển thị thông báo "Không khả dụng"
            alert("Không khả dụng");
        });
    }

    // Hiệu ứng đếm số tăng dần khi phần tử hiển thị trong viewport
    function parseNumberAndSuffix(text) {
        // Phân tích chuỗi để lấy giá trị số và hậu tố (nếu có)
        var t = (text || "").toString().trim();
        var match = t.match(/^(\d+(?:\.\d+)?)(.*)$/);
        if (!match) return { value: 0, suffix: "" };
        return { value: parseFloat(match[1]), suffix: match[2] || "" };
    }

    // Hàm tạo hiệu ứng đếm số từ 0 đến giá trị cuối cùng
    function animateCount(el, end, suffix, duration) {
        var start = 0;
        var startTime = null;
        duration = duration || 1500; // Thời gian mặc định là 1.5 giây
        
        // Hàm thực hiện từng bước của animation
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var current = Math.floor(start + (end - start) * p);
            
            // Giữ lại số thập phân nếu giá trị cuối cùng có phần thập phân
            if (String(end).indexOf(".") !== -1) {
                var decimals = String(end).split(".")[1].length;
                current = (start + (end - start) * p).toFixed(decimals);
            }
            
            el.textContent = current + (suffix || "");
            if (p < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    // Khởi tạo hiệu ứng đếm số cho các phần tử thống kê
    function initCounters() {
        // Lấy tất cả các phần tử có class stat-strong hoặc stat-card .number
        var targets = document.querySelectorAll(
            ".stat-strong, .stat-card .number"
        );
        if (!targets.length) return;
        
        // Sử dụng IntersectionObserver để theo dõi khi phần tử hiển thị trong viewport
        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var el = entry.target;
                        // Kiểm tra nếu đã đếm rồi thì bỏ qua
                        if (el.getAttribute("data-counted") === "1") return;
                        
                        // Phân tích giá trị số và hậu tố
                        var parsed = parseNumberAndSuffix(el.textContent);
                        el.setAttribute("data-counted", "1");
                        
                        // Đặt lại hiển thị về 0 trước khi bắt đầu animation
                        el.textContent = 0 + (parsed.suffix || "");
                        
                        // Bắt đầu hiệu ứng đếm số
                        animateCount(el, parsed.value, parsed.suffix, 1600);
                        
                        // Ngừng theo dõi phần tử này
                        io.unobserve(el);
                    }
                });
            },
            { threshold: 0.3 } // Kích hoạt khi 30% phần tử hiển thị
        );
        
        // Bắt đầu theo dõi tất cả các phần tử mục tiêu
        targets.forEach(function (el) {
            io.observe(el);
        });
    }

    // Kiểm tra trạng thái tải của trang và khởi tạo hiệu ứng đếm số
    if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
    ) {
        // Nếu trang đã tải xong, khởi tạo ngay lập tức
        initCounters();
    } else {
        // Nếu trang chưa tải xong, đợi sự kiện DOMContentLoaded
        document.addEventListener("DOMContentLoaded", initCounters);
    }
})();
