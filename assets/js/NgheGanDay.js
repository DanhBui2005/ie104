// Logic cho trang Nghe Gần Day (sao chép từ played.js)
// Xây dựng danh sách sử dụng cùng dữ liệu được hiển thị trong Queue (.q-item)
(function () {
  // Kiểm tra xem có phải trang nghe-gan-day không
  if (!document.body || !document.body.classList.contains('page-nghe-gan-day')) return;
  
  // Hàm xây dựng danh sách từ hàng chờ phát nhạc
  function buildFromQueue() {
    const body = document.getElementById("played-body");
    if (!body) return false;

    // Lấy tất cả các mục trong hàng chờ
    const items = Array.from(document.querySelectorAll(".q-item"));
    if (items.length === 0) return false;

    // Xóa nội dung hiện tại
    body.innerHTML = "";
    
    // Duyệt qua từng mục và tạo hàng mới
    items.forEach((rowEl, idx) => {
      const img = rowEl.querySelector(".q-cover img");
      const titleEl = rowEl.querySelector(".q-title-text");
      const artistEl = rowEl.querySelector(".q-artist");
      const timeEl = rowEl.querySelector(".q-time");
      const qi = rowEl.getAttribute("data-index") ?? String(idx);
      const row = document.createElement("div");
      row.className = "pt-row";
      row.setAttribute("role", "row");
      row.innerHTML = `
        <div class="pt-col idx">${idx + 1}</div>
        <div class="pt-col track">
          <div class="pt-cover" style="background-image:url('${img ? img.src : ""}')"></div>
          <div>
            <div class="pt-title">${titleEl ? titleEl.textContent : ""}</div>
          </div>
        </div>
        <div class="pt-col artist">${artistEl ? artistEl.textContent : ""}</div>
        <div class="pt-col time" id="ptime-${qi}">${timeEl ? timeEl.textContent : "--:--"}</div>
      `;
      // Thêm sự kiện click để phát bài hát khi click vào hàng
      row.addEventListener("click", () => rowEl.click());
      body.appendChild(row);
    });

    return true;
  }

  // Hàm khởi tạo
  function init() {
    if (buildFromQueue()) return;
    // Theo dõi thay đổi DOM để xây dựng danh sách khi có dữ liệu
    const obs = new MutationObserver(() => {
      if (buildFromQueue()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // Chạy khi trang đã tải xong
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

// Giữ cột Thời gian đồng bộ với thời gian trong Queue (tải không đồng bộ)
(function () {
  // Kiểm tra xem có phải trang nghe-gan-day không
  if (!document.body || !document.body.classList.contains('page-nghe-gan-day')) return;
  
  // Xử lý thay đổi DOM để đồng bộ thời gian
  function handleMutation(muts) {
    muts.forEach(() => {
      // Lấy tất cả các phần tử thời gian trong hàng chờ
      const times = document.querySelectorAll('.q-time[id^="qtime-"]');
      times.forEach((t) => {
        const idx = t.id.replace("qtime-", "");
        // Tìm phần tử thời gian tương ứng trong trang nghe gần đây
        const target = document.getElementById("ptime-" + idx);
        if (target && target.textContent !== t.textContent) {
          target.textContent = t.textContent;
        }
      });
    });
  }

  // Hàm bắt đầu theo dõi thay đổi
  function start() {
    const qlist = document.getElementById("queue-list");
    if (!qlist) return;
    // Theo dõi thay đổi trong danh sách hàng chờ
    const mo = new MutationObserver(handleMutation);
    mo.observe(qlist, { childList: true, subtree: true, characterData: true });
    // Chạy lần đầu để đồng bộ
    handleMutation([{ type: "childList" }]);
  }

  // Chạy khi trang đã tải xong
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
