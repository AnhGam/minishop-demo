// Cong cu chung: render HTML, escape, layout + menu + cong tac mode.

const { getMode } = require('./mode');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

function money(n) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);
}

function page(title, body, session, here) {
    const user = session && session.user;
    const mode = getMode(session);
    const on = (href) => here === href ? ' aria-current="page"' : '';
    const nav = user
        ? `<a href="/products"${on('/products')}>Bộ sưu tập</a>
           <a href="/orders"${on('/orders')}>Đơn hàng</a>
           <a href="/profile"${on('/profile')}>Trang cá nhân</a>
           <span class="who">${esc(user.full_name)}${user.is_admin ? ' <em>Quản trị</em>' : ''}</span>
           <form class="inline" method="post" action="/logout"><button class="text-btn">Thoát</button></form>`
        : `<a href="/products"${on('/products')}>Bộ sưu tập</a>
           <a href="/login"${on('/login')}>Đăng nhập</a>
           <a class="btn small" href="/register"${on('/register')}>Tạo tài khoản</a>`;

    const hint = mode === 'vulnerable'
        ? 'Đang mở bản lỗi.'
        : 'Đang mở bản đã sửa.';

    const home = here === '/';
    const shop = here === '/products' || here === '/orders' || here === '/profile';
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · MiniShop</title>
<link rel="stylesheet" href="/style.css">
</head>
<body class="${home ? 'is-home' : ''}${shop ? ' is-shop' : ''}">
${home ? '<div class="frame"><div class="canvas">' : ''}
<div class="top">
  <header class="mast">
    <a class="wordmark" href="/">MiniShop</a>
    <nav class="menu">${nav}</nav>
  </header>
  <div class="demo${mode === 'vulnerable' ? ' is-bad' : ' is-ok'}">
    <span class="demo-kicker"><i class="demo-dot"></i> Buổi demo</span>
    <form method="post" action="/mode" class="demo-form">
      <button name="mode" value="vulnerable" class="${mode === 'vulnerable' ? 'is-on' : ''}">Bản lỗi</button>
      <button name="mode" value="fixed" class="${mode === 'fixed' ? 'is-on' : ''}">Bản đã sửa</button>
    </form>
    <span class="demo-hint">${hint}</span>
  </div>
</div>
<main class="wrap${here === '/' ? ' is-home' : ''}" data-mode="${mode}">
${body}
</main>
<footer class="foot"><div class="foot-inner"><a class="wordmark" href="/">MiniShop</a><p>Cửa hàng máy chọn lọc.<br>Demo seminar bảo mật web. Dữ liệu giả lập.</p></div></footer>
${home ? '</div></div>' : ''}
</body>
</html>`;
}

function notImplemented(title, session, owner, where) {
    return page(title, `
<div class="notice warn">
  <h1>Chưa có</h1>
  <p>Phần này thuộc <b>${esc(owner)}</b>. Hãy viết nhánh <code>mode === 'vulnerable'</code> trong
     <code>${esc(where)}</code>.</p>
  <p class="quiet">Bấm công tắc phía trên về Bản đã sửa để xem nhánh đang chạy.</p>
</div>`, session);
}

function status(res, code, html) {
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
}

function html(code, markup) {
    return { code, html: markup };
}

module.exports = { esc, money, page, notImplemented, status, html };
