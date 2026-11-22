// Hàm dùng chung cho các route cần đăng nhập.
// Dùng:  if (!requireLogin(session)) return { redirect: '/login' };

function requireLogin(session) {
    return session.userId;
}

// Nâng cấp nhẹ: chặn luôn cả khi chưa đăng nhập, trả về 403 đúng như P2 cần.
function deny(message) {
    return { html: `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>403</title>
<link rel="stylesheet" href="/style.css"></head><body><main class="wrap">
<div class="notice"><h1>403</h1><p>${message}</p>
<p><a class="btn" href="/">Về trang mở đầu</a></p></div></main></body></html>` };
}

module.exports = { requireLogin, deny };
