"use strict";

(function () {
    var burger = document.querySelector("[data-burger]");
    var mobile = document.querySelector("[data-mobile]");
    if (burger && mobile) {
        burger.addEventListener("click", function () {
            mobile.classList.toggle("open");
        });
        mobile.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () {
                mobile.classList.remove("open");
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener("click", function (e) {
            var targetId = this.getAttribute("href");
            if (!targetId || targetId === "#") return;
            var el = document.querySelector(targetId);
            if (el) {
                e.preventDefault();
                var headerHeight =
                    document.querySelector(".header").offsetHeight;
                var elementPosition = el.getBoundingClientRect().top;
                var offsetPosition =
                    elementPosition + window.pageYOffset - headerHeight - 20; // Thêm 20px padding

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });
            }
        });
    });

    var signupBtn = document.querySelector("[data-cta-signup]");
    var demoBtn = document.querySelector("[data-cta-demo]");

    console.log("Buttons found:", signupBtn, demoBtn);

    if (signupBtn) {
        signupBtn.addEventListener("click", function (e) {
            console.log("CTA: Đăng ký miễn phí clicked");
            // Anchor tag will navigate automatically, but we can add tracking here
        });
    }
    if (demoBtn) {
        demoBtn.addEventListener("click", function (e) {
            console.log("CTA: Xem demo clicked");
            e.preventDefault();
            // Show "Không khả dụng" message with browser alert
            alert("Không khả dụng");
        });
    }

    // Count-up numbers when containers come into view
    function parseNumberAndSuffix(text) {
        var t = (text || "").toString().trim();
        var match = t.match(/^(\d+(?:\.\d+)?)(.*)$/);
        if (!match) return { value: 0, suffix: "" };
        return { value: parseFloat(match[1]), suffix: match[2] || "" };
    }

    function animateCount(el, end, suffix, duration) {
        var start = 0;
        var startTime = null;
        duration = duration || 1500;
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var current = Math.floor(start + (end - start) * p);
            // Keep decimals if end has decimal part
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

    function initCounters() {
        var targets = document.querySelectorAll(
            ".stat-strong, .stat-card .number"
        );
        if (!targets.length) return;
        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var el = entry.target;
                        if (el.getAttribute("data-counted") === "1") return;
                        var parsed = parseNumberAndSuffix(el.textContent);
                        el.setAttribute("data-counted", "1");
                        // Reset display to 0 before animating
                        el.textContent = 0 + (parsed.suffix || "");
                        animateCount(el, parsed.value, parsed.suffix, 1600);
                        io.unobserve(el);
                    }
                });
            },
            { threshold: 0.3 }
        );
        targets.forEach(function (el) {
            io.observe(el);
        });
    }

    if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
    ) {
        initCounters();
    } else {
        document.addEventListener("DOMContentLoaded", initCounters);
    }
})();
