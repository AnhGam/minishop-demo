// Code chạy trên trình duyệt. Thuộc P1; P4 thay thân hàm renderComments.
//
// PHÂN CÔNG P4 (trích): "Viết code trên trình duyệt để vẽ danh sách.
// Bản lỗi dùng innerHTML. Bản đã sửa dùng textContent."
//
// Hiện app render bình luận ở SERVER (routes/products.js) nên phần này chỉ là nguồn tham khảo
// cho trường hợp P4 muốn vẽ thêm bằng JS. Giữ nguyên để tham khảo, không tự ý xoá.

// Đọc công tắc bản demo mà server đã ghi sẵn ra HTML (data-mode trên <main>).
function currentMode() {
    return document.querySelector('main.wrap')?.dataset.mode || 'fixed';
}

// BẢN ĐÃ SỬA — tạo node và gán bằng textContent: trình duyệt chỉ hiện chữ,
// kể cả khi chữ đó trông giống thẻ HTML.
// P4: để tạo bản lỗi, thay thân vòng for bằng li.appendChild(...) tương đương nhưng
// gán innerHTML từ nội dung bình luận (ví dụ: li.innerHTML = commentContent).
function renderComments(comments) {
    const list = document.querySelector('.comments');
    if (!list) return;
    list.textContent = '';

    for (const c of comments) {
        const li = document.createElement('li');
        li.className = 'comment';

        const who = document.createElement('b');
        who.textContent = c.full_name || c.username || '';

        const meta = document.createElement('span');
        meta.className = 'muted';
        meta.textContent = ` @${c.username || ''} · ${c.created_at || ''}`;

        const body = document.createElement('p');
        body.textContent = c.content || ''; // ← textContent: an toàn

        li.append(who, meta, body);
        list.appendChild(li);
    }
}

// Demo cho case XSS khi mở ở chế độ bản lỗi bằng trình duyệt khác:
// nếu payload chạy được, alert sẽ hiện ra.
window.addEventListener('DOMContentLoaded', () => {
    const banner = document.querySelector('[data-mode]');
    if (banner && banner.dataset.mode === 'vulnerable') {
        console.info('MiniShop đang ở chế độ BẢN LỖI.');
    }
});
