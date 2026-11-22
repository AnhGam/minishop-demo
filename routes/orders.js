// Đơn hàng (thuộc P1: khung + danh sách).
// CHI TIẾT ĐƠN /order?id= thuộc P2 (Case 1: Broken Access Control / IDOR).

const db = require('../db');
const { page, esc, html, money } = require('../helpers');
const { getMode } = require('../mode');
const { requireLogin, deny } = require('../middleware');

const STATUS = {
    NEW: ['Mới', 'pill-new'],
    PAID: ['Đã thanh toán', 'pill-paid'],
    SHIPPED: ['Đang giao', 'pill-shipped'],
    CANCELLED: ['Đã hủy', 'pill-cancelled'],
};

function when(value) {
    const text = String(value || '');
    const [day, time] = text.split(' ');
    if (!time) return esc(text);
    return `${esc(day)} · ${esc(time)}`;
}

function statusPill(status) {
    const pair = STATUS[status] || [status, ''];
    return `<span class="pill ${pair[1]}">${esc(pair[0])}</span>`;
}

function orderList(session) {
    if (!requireLogin(session)) return { redirect: '/login' };
    const orders = db.prepare(`
        SELECT o.id, o.total, o.status, o.address, o.created_at
        FROM orders o WHERE o.user_id = ?
        ORDER BY o.id DESC`).all(session.userId);

    const body = `
<header class="collection orders-head">
  <p class="collection-kicker">Tài khoản</p>
  <h1>Đơn hàng</h1>
  <p class="lede">${orders.length} đơn của bạn</p>
</header>
${orders.length === 0 ? '<p class="quiet orders-empty">Bạn chưa có đơn hàng nào.</p>' : `
<ul class="orders">
${orders.map((o) => `
  <li><a class="order-card" href="/order?id=${o.id}">
    <span class="order-card-top">
      <span class="order-id">#${o.id}</span>
      ${statusPill(o.status)}
    </span>
    <span class="order-total">${money(o.total)}</span>
    <span class="order-date">${when(o.created_at)}</span>
    <span class="card-buy">Xem đơn</span>
  </a></li>`).join('\n')}
</ul>`}
<p class="order-note">Thử sửa trực tiếp <code>?id=</code> trên thanh địa chỉ để xem điều gì xảy ra.</p>`;
    return page('Đơn hàng', body, session, '/orders');
}

function orderDetail(session, query) {
    if (!requireLogin(session)) return { redirect: '/login' };
    const id = Number(query.id);

    if (Number.isNaN(id)) {
        return html(400, page('Đơn hàng', '<div class="notice warn"><h1>400</h1><p>Mã đơn phải là số.</p></div>', session, '/orders'));
    }

    // ===== P2: VIẾT LOGIC Ở ĐÂY =====
    // Đúng theo phân công: MỘT hàm, HAI nhánh chọn theo công tắc của P1.
    const mode = getMode(session);

    if (mode === 'vulnerable') {
        // Bản lỗi: chỉ tìm theo id, không kiểm tra order.user_id có trùng session.userId hay không.
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        if (!order) {
            return html(404, page('Đơn hàng', `
<div class="notice warn"><h1>404</h1>
<p>Đơn hàng không tồn tại.</p>
<p><a class="btn" href="/orders">Về đơn hàng của tôi</a></p></div>`, session, '/orders'));
        }
        return page('Đơn hàng #' + order.id, renderOrder(order), session, '/orders');
    }

    // Bản đã sửa: id VÀ user_id của người đang đăng nhập. Không đúng chủ → 403.
    // Đây là bản đã sửa — P2 có thể giữ nguyên hoặc viết lại cho khớp style của mình.
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, session.userId);

    if (!order) {
        const exists = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
        return html(exists ? 403 : 404,
            page('Đơn hàng', `
<div class="notice${exists ? '' : ' warn'}"><h1>${exists ? '403' : '404'}</h1>
<p>${exists ? 'Bạn không có quyền xem đơn hàng này.' : 'Đơn hàng không tồn tại.'}</p>
<p><a class="btn" href="/orders">Về đơn hàng của tôi</a></p></div>`, session, '/orders'));
    }

    return page('Đơn hàng #' + order.id, renderOrder(order), session, '/orders');
}

function renderOrder(order) {
    return `
<a class="back" href="/orders">← Đơn hàng của tôi</a>
<article class="order-sheet">
  <div class="card-top">
    <p class="card-price">${money(order.total)}</p>
    ${statusPill(order.status)}
  </div>
  <h1>Đơn #${order.id}</h1>
  <dl class="facts">
    <div><dt>Mã đơn</dt><dd>#${order.id}</dd></div>
    <div><dt>Địa chỉ giao</dt><dd>${esc(order.address)}</dd></div>
    <div><dt>Ngày tạo</dt><dd>${when(order.created_at)}</dd></div>
  </dl>
</article>
<p class="order-note">Địa chỉ giao trên là dữ liệu nhạy cảm — chỉ chủ đơn mới được xem.</p>`;
}

module.exports = function (route) {
    route('GET', '/orders', ({ session }) => orderList(session));
    route('GET', '/order', ({ session, query }) => orderDetail(session, query));
};
