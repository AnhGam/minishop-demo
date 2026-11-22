// Đăng nhập / thoát + công tắc bản demo + 1 route demo cho P3 nhúng vào.

const db = require('../db');
const { page, esc } = require('../helpers');
const { requireLogin } = require('../middleware');
const { getMode, setMode } = require('../mode');

// Ở đây CHỈ có phần khung: form, thông báo lỗi, chuyển trang.
// Logic kiểm tra tài khoản thuộc P3 (Case 2: SQL Injection) — P3 sẽ thay thân hàm loginHandler.

function accountList() {
    return `
<ul class="accounts">
  <li><span>user1</span><span>user1123</span><em>chủ đơn 101</em></li>
  <li><span>user2</span><span>user2123</span><em>chủ đơn 102</em></li>
  <li><span>admin</span><span>admin123</span><em>quản trị</em></li>
</ul>`;
}

function loginPage(session, message, oldUsername) {
    const body = `
<div class="sheet">
  <p class="eyebrow">MiniShop</p>
  <h1>Đăng nhập</h1>
  ${message ? `<p class="msg">${esc(message)}</p>` : ''}
  <form method="post" action="/login" class="form">
    <label>Tên đăng nhập
      <input name="username" autocomplete="username" value="${esc(oldUsername || '')}" autofocus>
    </label>
    <label>Mật khẩu
      <input name="password" type="password" autocomplete="current-password">
    </label>
    <button>Đăng nhập</button>
  </form>
  <p class="sheet-links">Chưa có tài khoản? <a href="/register">Tạo tài khoản</a></p>
  <details class="demo-accounts">
    <summary>Tài khoản demo, xem trước khi diễn</summary>
    ${accountList()}
  </details>
</div>`;
    return page('Đăng nhập', body, session, '/login');
}

function registerPage(session, message, old) {
    const kept = old || {};
    const body = `
<div class="sheet">
  <p class="eyebrow">MiniShop</p>
  <h1>Tạo tài khoản</h1>
  ${message ? `<p class="msg">${esc(message)}</p>${accountList()}` : ''}
  <form method="post" action="/register" class="form">
    <label>Họ tên
      <input name="full_name" autocomplete="name" value="${esc(kept.full_name || '')}" autofocus>
    </label>
    <label>Tên đăng nhập
      <input name="username" autocomplete="username" value="${esc(kept.username || '')}">
    </label>
    <label>Mật khẩu
      <input name="password" type="password" autocomplete="new-password">
    </label>
    <button>Tạo tài khoản</button>
  </form>
  <p class="sheet-links">Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
</div>`;
    return page('Tạo tài khoản', body, session, '/register');
}

// P3 THAY THÂN HÀM NÀY. Bản "đã sửa" dùng câu SQL tham số (?), bản lỗi ghép chuỗi.
// Nhận thêm remember()/forget() từ server để ghi lại cookie.
function loginHandler({ session, body, remember }) {
    const mode = getMode(session);
    const username = body.username || '';
    const password = body.password || '';

    if (mode === 'vulnerable') {
      // BẢN LỖI: ghép thẳng input vào câu SQL => input đổi được NGHĨA câu lệnh
      const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
      let user;
      try {
        user = db.prepare(sql).get();     // Câu lệnh đã bị input chèn vào
      } catch (e) {
        // input làm hỏng cú pháp SQL => hiện lỗi, tránh sập app
        return loginPage(session, 'Lỗi SQL: ' + e.message, username);
      }
      if (!user) return loginPage(session, 'Sai tài khoản hoặc mật khẩu', username);
      session.userId = user.id;
      session.user = { id: user.id, username: user.username, full_name: user.full_name, is_admin: !!user.is_admin };
      remember();                         // ghi lại cookie sau khi đăng nhập
      return { redirect: '/profile' };
    }

    // Bản đã sửa: dữ liệu truyền riêng, không ghép vào cú pháp SQL.
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (!user) {
        return loginPage(session, 'Sai tài khoản hoặc mật khẩu', username);
    }
    session.userId = user.id;
    session.user = { id: user.id, username: user.username, full_name: user.full_name, is_admin: !!user.is_admin };
    remember();          // ghi lại cookie sau khi session thay đổi
    return { redirect: '/profile' };
}


module.exports = function (route) {
    route('GET', '/login', ({ session }) => loginPage(session, null, ''));

    route('GET', '/register', ({ session }) => registerPage(session, null, null));

    route('POST', '/register', ({ session, body }) => registerPage(
        session,
        'Buổi demo dùng tài khoản đã chuẩn bị sẵn. Hãy đăng nhập bằng một tài khoản bên dưới.',
        body,
    ));

    route('POST', '/login', (ctx) => {
        const out = loginHandler(ctx);
        return out && out.redirect ? { redirect: out.redirect } : out;
    });

    route('POST', '/logout', ({ forget }) => {
        forget();
        return { redirect: '/' };
    });

    // --- Công tắc bản demo: nút trên giao diện, gửi xuống server (thuộc P1) ---
    route('POST', '/mode', ({ session, body, req }) => {
        setMode(session, body.mode);
        return { redirect: req.headers.referer || '/' };
    });
};
