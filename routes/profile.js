// Trang cá nhân — đích chuyển tới sau khi đăng nhập (dùng cho cả 3 case).
// PHÂN CÔNG P3: "Sau khi đăng nhập đúng, chuyển sang một trang đơn giản ghi rõ
// đang vào bằng tài khoản nào (thường hay admin), để khán giả thấy kết quả."

const db = require('../db');
const { page, esc, money } = require('../helpers');
const { requireLogin } = require('../middleware');

module.exports = function (route) {
    route('GET', '/profile', ({ session }) => {
        if (!requireLogin(session)) return { redirect: '/login' };

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
        if (!user) return { redirect: '/login' };

        const body = `
<h1>Trang cá nhân</h1>
<div class="box ${user.is_admin ? 'danger-note' : ''}">
  <p>Bạn đang đăng nhập bằng tài khoản <b>${esc(user.full_name)}</b>
     <code>@${esc(user.username)}</code>${user.is_admin ? ' — <b>QUẢN TRỊ</b>' : ''}.</p>
</div>
<table class="tbl kv">
  <tr><th>ID</th><td>${user.id}</td></tr>
  <tr><th>Họ tên</th><td>${esc(user.full_name)}</td></tr>
  <tr><th>Email</th><td>${esc(user.email)}</td></tr>
  <tr><th>Số điện thoại</th><td>${esc(user.phone)}</td></tr>
  <tr><th>Địa chỉ</th><td>${esc(user.address)}</td></tr>
  <tr><th>Số dư</th><td>${money(user.balance)}</td></tr>
</table>
<p><a class="btn" href="/orders">Xem đơn hàng của tôi</a></p>`;
        return page('Trang cá nhân', body, session);
    });
};
