// Kiểm tra tự động. Chạy: node test/smoke.js
// Tự khởi động server trên cổng rảnh, chạy xong thì tắt. Không đụng cổng 3000 của người khác.

const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
const failures = [];

function check(name, actual, expected) {
    if (actual === expected) { passed++; return; }
    failed++; failures.push(`  ${name}: got "${actual}", expected "${expected}"`);
}

async function req(method, urlPath, body, jar) {
    const headers = {};
    if (jar && jar.cookies) headers.Cookie = jar.cookies;
    let data = body;
    if (body && typeof body === 'object') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        data = new URLSearchParams(body).toString();
    }
    const res = await fetch(BASE + urlPath, { method, headers, body: data, redirect: 'manual' });
    const set = res.headers.get('set-cookie');
    if (set && jar) {
        const pair = set.split(';')[0];
        jar.cookies = jar.cookies ? jar.cookies + '; ' + pair : pair;
    }
    return { status: res.status, text: await res.text() };
}

function has(text, needle) { return text.includes(needle); }

async function main() {
    const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: 'ignore',
    });
    const cleanup = () => { try { server.kill(); } catch {} };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(1); });

    // đợi server lên
    let up = false;
    for (let i = 0; i < 40; i++) {
        try { await fetch(BASE); up = true; break; }
        catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    if (!up) {
        console.error('Server không khởi động được. Xem lại server.js.');
        cleanup();
        process.exit(1);
    }

    const jar = { cookies: '' };
    const admin = { cookies: '' };

    console.log('\nKhung P1 — smoke test\n');

    // ---- trang tĩnh ----
    check('GET /', (await req('GET', '/', null, jar)).status, 200);
    check('GET /login', (await req('GET', '/login', null, jar)).status, 200);
    check('GET /product/1', (await req('GET', '/product/1', null, jar)).status, 200);
    check('GET /product/999 (không có)', (await req('GET', '/product/999', null, jar)).status, 404);
    check('GET /khongco (404)', (await req('GET', '/khongco', null, jar)).status, 404);
    check('style.css', (await req('GET', '/style.css')).status, 200);

    // ---- chưa đăng nhập ----
    const noLogin = await req('GET', '/order?id=101', null, { cookies: '' });
    check('/order chưa đăng nhập → về login', noLogin.status, 303);

    // ---- đăng nhập user1 ----
    const login = await req('POST', '/login', { username: 'user1', password: 'user1123' }, jar);
    check('đăng nhập user1', login.status, 303);
    check('vào /profile', (await req('GET', '/profile', null, jar)).status, 200);

    const bad = await req('POST', '/login', { username: 'user1', password: 'SAI' }, { cookies: login.cookies || '' });
    check('sai mật khẩu → hiện lại form', bad.status, 200);
    check('  có thông báo', has(bad.text, 'Sai tai khoan') || has(bad.text, 'Sai tài khoản'), true);
    await req('POST', '/login', { username: 'user1', password: 'user1123' }, jar); // đăng nhập lại

    // ---- Case 1: bản ĐÃ SỬA phải chặn ----
    const mine = await req('GET', '/order?id=101', null, jar);
    check('đơn 101 (của user1)', mine.status, 200);
    check('  có địa chỉ chủ', has(mine.text, '12 Le Loi'), true);

    check('đơn 102 (của user2) → 403', (await req('GET', '/order?id=102', null, jar)).status, 403);
    check('đơn 999 → 404', (await req('GET', '/order?id=999', null, jar)).status, 404);
    check('đơn không số → 400', (await req('GET', '/order?id=abc', null, jar)).status, 400);

    // ---- bình luận ----
    check('gửi bình luận', (await req('POST', '/product/1/comment', { content: 'test tu dong' }, jar)).status, 303);
    const after = await req('GET', '/product/1', null, jar);
    check('  bình luận mới hiện ra', has(after.text, 'test tu dong'), true);

    // ---- P4: chống XSS ----
    const payload = "<script>alert('XSS')</script>";
    await req('POST', '/product/1/comment', { content: payload }, jar);
    const page = await req('GET', '/product/1', null, jar);
    check('payload KHÔNG được xuất thẳng', has(page.text, "<script>alert('XSS')</script>"), false);
    check("  mà được escape", has(page.text, "&lt;script&gt;"), true);

    // ---- công tắc ----
    check('đổi sang vulnerable', (await req('POST', '/mode', { mode: 'vulnerable' }, jar)).status, 303);
    const vulnPage = await req('GET', '/product/1', null, jar);
    check('  mode ghi ra HTML', has(vulnPage.text, 'data-mode="vulnerable"'), true);
    check('đổi về fixed', (await req('POST', '/mode', { mode: 'fixed' }, jar)).status, 303);

    // ---- admin ----
    check('đăng nhập admin', (await req('POST', '/login', { username: 'admin', password: 'admin123' }, admin)).status, 303);
    const adminProfile = await req('GET', '/profile', null, admin);
    check('  thấy vai trò quản trị', has(adminProfile.text, '@admin'), true);
    check('  KHÔNG thấy đơn 101 của user1', has(await req('GET', '/order?id=101', null, admin).then(r => r.text), '12 Le Loi'), false);

    // ---- logout ----
    check('logout', (await req('POST', '/logout', null, jar)).status, 303);
    check('  /order lại về login', (await req('GET', '/order?id=101', null, { cookies: jar.cookies })).status, 303);

    cleanup();

    console.log(`\n${passed} PASS, ${failed} FAIL`);
    if (failures.length) {
        console.log('\nCHI TIẾT LỖI:');
        failures.forEach((f) => console.log(f));
        console.log('\nLưu ý: một số FAIL có thể là do P2/P3/P4 vừa sửa nhánh "bản lỗi".');
        process.exit(1);
    }
    console.log('Khung P1 vẫn chạy đúng.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
