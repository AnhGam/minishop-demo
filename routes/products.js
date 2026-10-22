// Trang chủ + danh sách sản phẩm (thuộc P1).
// Chi tiết sản phẩm + khối bình luận nằm trong comments.js ← P4 (Case 3: XSS).

const db = require('../db');
const { page, esc, html, money, notImplemented } = require('../helpers');
const { getMode } = require('../mode');

function home(session) {
    const products = db.prepare('SELECT id, name, description, price, stock FROM products ORDER BY id').all();
    const body = `
<section class="hero">
  <h1>MiniShop</h1>
  <p class="lead">Danh sách sản phẩm dùng cho demo seminar bảo mật web app.</p>
</section>
<div class="grid">
${products.map((p) => `
  <article class="card">
    <h2>${esc(p.name)}</h2>
    <p class="desc">${esc(p.description)}</p>
    <p class="price">${money(p.price)}</p>
    <p class="stock">Còn ${p.stock} sản phẩm</p>
    <a class="btn" href="/product/${p.id}">Xem chi tiết &amp; bình luận</a>
  </article>`).join('\n')}
</div>`;
    return page('Trang chủ', body, session);
}

module.exports = function (route) {
    route('GET', '/', ({ session }) => home(session));

    route('GET', '/products', ({ session }) => home(session));

    // P4 làm chi tiết sản phẩm. Nếu P4 chưa sửa, phần bình luận sẽ báo "chưa làm".
    route('GET', '/product/:id', ({ session, params }) => {
        const id = Number(params.id);
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!product) return html(404, page('Không tìm thấy', '<div class="box warn"><h1>404</h1><p>Sản phẩm không tồn tại.</p></div>', session));

        const mode = getMode(session);
        const comments = db.prepare(`
            SELECT c.content, u.username, u.full_name, c.created_at
            FROM comments c JOIN users u ON u.id = c.user_id
            WHERE c.product_id = ? ORDER BY c.id`).all(id);

        // P4: thay đoạn vẽ bình luận ở đây.
        //   Bản lỗi  → innerHTML / xuất chuỗi thẳng (session/mode 'vulnerable')
        //   Bản sửa  → textContent / escape khi xuất (session/mode 'fixed')
        let commentsHtml;
        if (mode === 'vulnerable') {
            commentsHtml = notImplemented('Bình luận', session, 'P4', 'routes/comments.js');
        } else {
            // Bản đã sửa: mọi chuỗi từ người dùng đều qua esc() trước khi ra HTML.
            commentsHtml = `
<ul class="comments">
${comments.map((c) => `
  <li class="comment">
    <b>${esc(c.full_name)}</b> <span class="muted">@${esc(c.username)} · ${esc(c.created_at)}</span>
    <p>${esc(c.content)}</p>
  </li>`).join('\n')}
</ul>`;
        }

        const body = `
<a class="back" href="/">← Về danh sách</a>
<div class="detail">
  <h1>${esc(product.name)}</h1>
  <p class="desc">${esc(product.description)}</p>
  <p class="price">${money(product.price)} <span class="stock">(còn ${product.stock})</span></p>
</div>

<section class="comments-section">
  <h2>Bình luận</h2>
  ${commentsHtml}
  <form method="post" action="/product/${id}/comment" class="form comment-form">
    <textarea name="content" rows="3" placeholder="Viết bình luận..." required maxlength="500"></textarea>
    <button class="primary">Gửi bình luận</button>
  </form>
</section>`;
        return page(product.name, body, session);
    });
};
