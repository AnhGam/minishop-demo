// Bình luận sản phẩm — khuôn cho P4 (Case 3: Stored XSS).
// PHÂN CÔNG P4 (trích): "Viết hàm server nhận nội dung và lưu nguyên văn vào bảng comments.
// Không sửa nội dung lúc lưu. Điểm khác nhau của hai bản nằm ở chỗ vẽ ra màn hình."
//
// Việc lưu nằm ở đây (đã xong, không cần sửa). Việc VẼ nằm ở:
//   - routes/products.js  (server render: dùng esc() hay không)
//   - public/app.js       (trình duyệt: textContent hay innerHTML)

const db = require('../db');
const { requireLogin } = require('../middleware');

module.exports = function (route) {
    route('POST', '/product/:id/comment', ({ session, params, body }) => {
        if (!requireLogin(session)) return { redirect: '/login' };

        const productId = Number(params.id);
        const content = (body.content || '').trim();

        if (!content) return { redirect: '/product/' + productId };
        if (!db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) {
            return { redirect: '/' };
        }

        // LƯU NGUYÊN VĂN — có chủ đích, không sửa nội dung ở đây.
        db.prepare('INSERT INTO comments (product_id, user_id, content) VALUES (?, ?, ?)')
            .run(productId, session.userId, content);

        return { redirect: '/product/' + productId };
    });
};
