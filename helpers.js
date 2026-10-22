// Cong cu chung: render HTML, escape, layout + menu + cong tac mode.

const { getMode } = require('./mode');

// --- escape: bat buoc cho moi du lieu tu nguoi dung dung ra HTML ---
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

function money(n) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);
}

function page(title, body, session) {
    const user = session && session.user;
    const mode = getMode(session);
    const nav = user
        ? `<a href="/">Trang chủ</a>
           <a href="/products">Sản phẩm</a>
           <a href="/orders">Đơn hàng</a>
           <a href="/profile">Trang cá nhân</a>
           <span class="nav-right">${esc(user.full_name)}${user.is_admin ? ' <i>(admin)</i>' : ''}
             <form class="inline" method="post" action="/logout"><button class="linkish">Thoát</button></form>
           </span>`
        : `<a href="/">Trang chủ</a>
           <a href="/products">Sản phẩm</a>
           <a href="/login">Đăng nhập</a>`;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · MiniShop</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="/">MiniShop</a>
  <nav class="nav">${nav}</nav>
</header>

<div class="modebar">
  <span class="modelabel">Công tắc bản demo (server):</span>
  <form method="post" action="/mode" class="modeform">
    <button name="mode" value="vulnerable" class="${mode === 'vulnerable' ? 'on danger' : ''}">Bản lỗi</button>
    <button name="mode" value="fixed" class="${mode === 'fixed' ? 'on ok' : ''}">Bản đã sửa</button>
  </form>
  <span class="modehint">${mode === 'vulnerable'
      ? 'Đang ở chế độ <b>BẢN LỖI</b> — chức năng nào chưa có code sẽ báo "chưa làm".'
      : 'Đang ở chế độ <b>BẢN ĐÃ SỬA</b>.'}</span>
</div>

<main class="wrap" data-mode="${mode}">
${body}
</main>

<footer class="foot">MiniShop — demo seminar bảo mật web app. Dữ liệu giả lập, không dùng thật.</footer>
</body>
</html>`;
}

// Trang báo cho P2/P3/P4: hiện khi đang ở "Bản lỗi" mà nhánh đó chưa được viết.
function notImplemented(title, session, owner, where) {
    return page(title, `
<div class="box warn">
  <h2>Chưa có code cho "Bản lỗi"</h2>
  <p>Phần này thuộc <b>${esc(owner)}</b>. Hãy viết nhánh <code>mode === 'vulnerable'</code> trong
     <code>${esc(where)}</code>, rồi thay hàm này bằng kết quả thật.</p>
  <p class="muted">Bấm công tắc ở trên về <b>Bản đã sửa</b> để xem nhánh đã chạy được.</p>
</div>`, session);
}

function status(res, code, html) {
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
}

// Trả về "HTML + mã lỗi" để server.js ghi đúng status (P2 cần 403).
function html(code, markup) {
    return { code, html: markup };
}

module.exports = { esc, money, page, notImplemented, status, html };
