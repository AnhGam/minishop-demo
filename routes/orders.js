// Đơn hàng (thuộc P1: khung + danh sách).
// CHI TIẾT ĐƠN /order?id= thuộc P2 (Case 1: Broken Access Control / IDOR).

const db = require('../db');
const { page, esc, html, money, notImplemented } = require('../helpers');
const { getMode } = require('../mode');
const { requireLogin, deny } = require('../middleware');

function orderList(session) {
    if (!requireLogin(session)) return { redirect: '/login' };
    const orders = db.prepare(`
        SELECT o.id, o.total, o.status, o.address, o.created_at
        FROM orders o WHERE o.user_id = ?
        ORDER BY o.id DESC`).all(session.userId);

    const body = `
<h1>Đơn hàng của tôi</h1>
${orders.length === 0 ? '<p class="muted">Bạn chưa có đơn hàng nào.</p>' : `
<table class="tbl">
  <thead><tr><th>Mã đơn</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead>
  <tbody>
${orders.map((o) => `
  <tr>
    <td>#${o.id}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td>
    <td>${esc(o.created_at)}</td>
    <td><a class="btn small" href="/order?id=${o.id}">Xem</a></td>
  </tr>`).join('\n')}
  </tbody>
</table>`}
<p class="muted">Thử sửa trực tiếp <code>?id=</code> trên thanh địa chỉ để xem điều gì xảy ra.</p>`;
    return page('Đơn hàng', body, session);
}

function orderDetail(session, query) {
    if (!requireLogin(session)) return { redirect: '/login' };
    const id = Number(query.id);

    if (Number.isNaN(id)) {
        return html(400, page('Đơn hàng', '<div class="box warn"><h1>400</h1><p>Mã đơn phải là số.</p></div>', session));
    }

    // ===== P2: VIẾT LOGIC Ở ĐÂY =====
    // Đúng theo phân công: MỘT hàm, HAI nhánh chọn theo công tắc của P1.
    const mode = getMode(session);

    if (mode === 'vulnerable') {
        // TODO(P2) — BẢN LỖI: chỉ tìm theo id, KHÔNG kiểm tra chủ đơn.
        //   const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        //   ...rồi render order (dù order.user_id !== session.userId vẫn hiện).
        // Trong lúc chưa viết, tạm trả trang "chưa làm" để app không vỡ:
        return notImplemented('Đơn hàng', session, 'P2', 'routes/orders.js');
    }

    // Bản đã sửa: id VÀ user_id của người đang đăng nhập. Không đúng chủ → 403.
    // Đây là bản đã sửa — P2 có thể giữ nguyên hoặc viết lại cho khớp style của mình.
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, session.userId);

    if (!order) {
        const exists = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
        return html(exists ? 403 : 404,
            page('Đơn hàng', `
<div class="box error"><h1>${exists ? '403' : '404'}</h1>
<p>${exists ? 'Bạn không có quyền xem đơn hàng này!' : 'Đơn hàng không tồn tại.'}</p>
<p><a href="/orders">Về danh sách đơn hàng</a></p></div>`, session));
    }

    const body = `
<a class="back" href="/orders">← Đơn hàng của tôi</a>
<h1>Đơn hàng #${order.id}</h1>
<table class="tbl kv">
  <tr><th>Mã đơn</th><td>#${order.id}</td></tr>
  <tr><th>Trạng thái</th><td>${esc(order.status)}</td></tr>
  <tr><th>Tổng tiền</th><td>${money(order.total)}</td></tr>
  <tr><th>Địa chỉ giao</th><td>${esc(order.address)}</td></tr>
  <tr><th>Ngày tạo</th><td>${esc(order.created_at)}</td></tr>
</table>
<p class="muted">Địa chỉ giao trên là dữ liệu nhạy cảm — chỉ chủ đơn mới được xem.</p>`;
    return page('Đơn hàng #' + order.id, body, session);
}

module.exports = function (route) {
    route('GET', '/orders', ({ session }) => orderList(session));
    route('GET', '/order', ({ session, query }) => orderDetail(session, query));
};
