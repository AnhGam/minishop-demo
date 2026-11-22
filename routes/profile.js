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

        const admin = user.is_admin ? '<span class="pill">Quản trị</span>' : '';
        const body = `
<header class="collection">
  <p class="collection-kicker">Tài khoản</p>
  <h1>Trang cá nhân</h1>
  <p class="lede">Bạn đang ở tài khoản ${esc(user.full_name)}</p>
</header>
<article class="order-sheet profile-card">
  <div class="card-top">
    <p class="profile-handle"><code>@${esc(user.username)}</code></p>
    ${admin}
  </div>
  <p class="profile-name">${esc(user.full_name)}</p>
  <dl class="facts">
    <div><dt>ID</dt><dd>${user.id}</dd></div>
    <div><dt>Email</dt><dd>${esc(user.email)}</dd></div>
    <div><dt>Số điện thoại</dt><dd>${esc(user.phone)}</dd></div>
    <div><dt>Địa chỉ</dt><dd>${esc(user.address)}</dd></div>
    <div><dt>Số dư</dt><dd>${money(user.balance)}</dd></div>
  </dl>
</article>
<p class="profile-actions"><a class="btn" href="/orders">Xem đơn hàng của tôi</a></p>`;
        return page('Trang cá nhân', body, session, '/profile');
    });
};
