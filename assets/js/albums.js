// Quản lý dữ liệu album cho Music Box
(function () {
    // Ánh xạ nghệ sĩ với hình ảnh album của họ
    const artistAlbumMap = {
        "Sơn Tùng M-TP": [
            "./assets/music_data/album/son_tung_mtp/lac_troi.jpg",
            "./assets/music_data/album/son_tung_mtp/making_my_way.jpg",
            "./assets/music_data/album/son_tung_mtp/sky_decade.jpg",
            "./assets/music_data/album/son_tung_mtp/sky_tour.jpg",
        ],
        Tlinh: [
            "./assets/music_data/album/tlinh/ai.jpg",
            "./assets/music_data/album/tlinh/cai_dep.jpg",
            "./assets/music_data/album/tlinh/ghe_iu_dau_cua_em_oi.jpg",
            "./assets/music_data/album/tlinh/nguoi_dien.jpg",
        ],
        "Trúc Nhân": [
            "./assets/music_data/album/truc_nhan/bon_chu_lam.jpg",
            "./assets/music_data/album/truc_nhan/co_gai_den_tu_hom_qua_ost.jpg",
            "./assets/music_data/album/truc_nhan/made_in_viet_nam.jpg",
            "./assets/music_data/album/truc_nhan/xuan_ha_thu_dong.jpg",
        ],
        "Han Sara": [
            "./assets/music_data/album/han_sara/i_sara_you.jpg",
            "./assets/music_data/album/han_sara/que_a_du.jpg",
            "./assets/music_data/album/han_sara/unfrozen.jpg",
            "./assets/music_data/album/han_sara/vibeglo.jpg",
        ],
        "Em Xinh Say Hi": [
            "./assets/music_data/album/em_xinh_say_hi/em_xinh_say_hi_tap_7.jpg",
            "./assets/music_data/album/em_xinh_say_hi/em_xinh_say_hi_tap_11.jpg",
            "./assets/music_data/album/em_xinh_say_hi/em_xinh_say_hi_tap_13.jpg",
            "./assets/music_data/album/em_xinh_say_hi/em_xinh_say_hi_tap_14.jpg",
        ],
        "Anh Trai Say Hi": [
            "./assets/music_data/album/anh_trai_say_hi/anh_trai_say_hi_2025_tap_1.jpg",
            "./assets/music_data/album/anh_trai_say_hi/anh_trai_say_hi_2025_tap_4.jpg",
            "./assets/music_data/album/anh_trai_say_hi/anh_trai_say_hi_2025_tap_8.jpg",
            "./assets/music_data/album/anh_trai_say_hi/anh_trai_say_hi_2025_tap7.jpg",
        ],
        "Chi Xê": [
            "./assets/music_data/album/chi_xe/moc_mien.jpg",
            "./assets/music_data/album/chi_xe/seenderella.jpg",
            "./assets/music_data/album/chi_xe/thinker_tell.jpg",
            "./assets/music_data/album/chi_xe/u.jpg",
        ],
    };

    // Tên album cho từng nghệ sĩ
    const albumNames = {
        "Sơn Tùng M-TP": [
            "Lạc Trôi",
            "Making My Way",
            "Sky Decade",
            "Sky Tour",
        ],
        Tlinh: ["AI", "Cái Đẹp", "Ghé Iu Dấu Của Em Ơi", "Người Điên"],
        "Trúc Nhân": [
            "Bốn Chữ Lắm",
            "Cô Gái Đến Từ Hôm Qua OST",
            "Made In Vietnam",
            "Xuân Hạ Thu Đông",
        ],
        "Han Sara": ["I SARA YOU", "Que A Du", "Unfrozen", "Vibeglo"],
        "Em Xinh Say Hi": [
            "Em Xinh Say Hi Tập 7",
            "Em Xinh Say Hi Tập 11",
            "Em Xinh Say Hi Tập 13",
            "Em Xinh Say Hi Tập 14",
        ],
        "Anh Trai Say Hi": [
            "Anh Trai Say Hi 2025 Tập 1",
            "Anh Trai Say Hi 2025 Tập 4",
            "Anh Trai Say Hi 2025 Tập 8",
            "Anh Trai Say Hi 2025 Tập 7",
        ],
        "Chi Xê": ["Mộc Miên", "Seenderella", "Thinker Tell", "U"],
    };

    // Chuẩn hóa chuỗi để so sánh
    function normalize(s) {
        return (s || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    // Lấy danh sách album của một nghệ sĩ
    function getAlbumsForArtist(artistName) {
        const artistNorm = normalize(artistName);

        // Tìm nghệ sĩ khớp (không phân biệt chữ hoa/thường)
        const matchedArtist = Object.keys(artistAlbumMap).find(
            (artist) => normalize(artist) === artistNorm
        );

        if (!matchedArtist) return [];

        const albumImages = artistAlbumMap[matchedArtist] || [];
        const albumTitles = albumNames[matchedArtist] || [];

        return albumImages.map((image, index) => ({
            image: image,
            name: albumTitles[index] || `Album ${index + 1}`,
            artist: matchedArtist,
        }));
    }

    // Lấy một album ngẫu nhiên của một nghệ sĩ
    function getRandomAlbumForArtist(artistName) {
        const albums = getAlbumsForArtist(artistName);
        if (!albums.length) return null;

        const randomIndex = Math.floor(Math.random() * albums.length);
        return albums[randomIndex];
    }

    // Cung cấp các hàm toàn cầu
    window.MusicBoxAlbums = {
        getAlbumsForArtist,
        getRandomAlbumForArtist,
    };
})();
