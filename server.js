// Entry point. Không dùng thư viện ngoài: node:http + node:sqlite có sẵn trong Node 22+.
//   chạy:            node server.js
//   chạy + reset DB: node server.js --reset
//   đổi port:        PORT=4000 node server.js

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const status = require('./helpers').status;

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const SECRET = crypto.randomBytes(32); // ký cookie session — sinh mới mỗi lần khởi động

const MIME = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
};

// ---------------------------------------------------------------- session
// Session cua demo nay la in-memory Map + cookie co chu ky HMAC.
// Day la kieu don gian nhat cho demo (khong co DataStore, khong co DB session).
// Neu chay that thi phai dung thu vien session co san va khong de SECRET random moi lan restart.
const sessions = new Map(); // sid -> { sid, userId, mode, lastSeen }
const SID_COOKIE = 'minishop_sid';
const SID_TTL_MS = 12 * 60 * 60 * 1000;

function parseCookies(header) {
    const out = {};
    for (const part of (header || '').split(';')) {
        const i = part.indexOf('=');
        if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
}

function sign(sid) {
    return crypto.createHmac('sha256', SECRET).update(sid).digest('base64url').slice(0, 22);
}

// Một cookie duy nhất: "<sid>.<chu ky>". Client không tự bịa được chu ký vì không biết SECRET.
function sessionCookie(data) {
    const flags = 'Path=/; HttpOnly; SameSite=Strict'; // SameSite chống CSRF cho các POST của app
    return `${SID_COOKIE}=${data.sid}.${sign(data.sid)}; ${flags}`;
}

function readSession(req) {
    const token = parseCookies(req.headers.cookie)[SID_COOKIE] || '';
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;

    const sid = token.slice(0, dot);
    if (sign(sid) !== token.slice(dot + 1)) return null; // ký sai → coi như khách

    const data = sessions.get(sid);
    if (!data || Date.now() - data.lastSeen > SID_TTL_MS) return null;

    data.lastSeen = Date.now();
    return data;
}

// Tạo session mới cho khách chưa đăng nhập (và giữ cookie đó qua các request sau).
function guestSession(res) {
    const data = { sid: crypto.randomUUID(), userId: null, user: null, mode: 'fixed', lastSeen: Date.now() };
    sessions.set(data.sid, data);
    res.setHeader('Set-Cookie', sessionCookie(data));
    return data;
}

function remember(res, data) {
    res.setHeader('Set-Cookie', sessionCookie(data));
}

function forget(res) {
    res.setHeader('Set-Cookie', `${SID_COOKIE}=; Path=/; Max-Age=0`);
}

// ---------------------------------------------------------------- body
function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (c) => {
            raw += c;
            if (raw.length > 64 * 1024) { reject(new Error('body too large')); req.destroy(); }
        });
        req.on('end', () => resolve(raw));
        req.on('error', reject);
    });
}

// ---------------------------------------------------------------- router
// Mỗi chức năng 1 file trong routes/. Muốn thêm chức năng: thêm dòng require bên dưới.
const routes = [];
require('./routes')((method, pathname, handler) => routes.push({ method, pathname, handler }));

// Route dạng /product/:id — lái pathname thật sang đúng route và trả ra params.
function matchRoute(method, pathname) {
    const parts = pathname.split('/');
    for (const r of routes) {
        if (r.method !== method) continue;
        const rp = r.pathname.split('/');
        if (rp.length !== parts.length) continue;

        const params = {};
        let ok = true;
        for (let i = 0; i < rp.length; i++) {
            if (rp[i].startsWith(':')) {
                if (parts[i] === '') { ok = false; break; }
                params[rp[i].slice(1)] = decodeURIComponent(parts[i]);
            } else if (rp[i] !== parts[i]) { ok = false; break; }
        }
        if (ok) return { handler: r.handler, params };
    }
    return null;
}

// Handler trả về: string (HTML 200) | { redirect } | { code, html } | undefined (204).
function send(res, out) {
    if (out === undefined || out === null) return status(res, 204, '');
    if (typeof out === 'string') return status(res, 200, out);
    if (out.redirect) {
        res.writeHead(303, { Location: out.redirect });
        return res.end();
    }
    if (out.html !== undefined) {
        res.writeHead(out.code || 200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(out.html);
    }
    return status(res, 204, '');
}

function notFound(res, pathname) {
    const markup = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>404</title>
<link rel="stylesheet" href="/style.css"></head><body><main class="wrap">
<div class="box warn"><h1>404 Không tìm thấy trang</h1><p><code>${pathname}</code> không tồn tại.</p>
<p><a href="/">Về trang chủ</a></p></div></main></body></html>`;
    return send(res, { code: 404, html: markup });
}

function serveStatic(res, file) {
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) return status(res, 403, '<h1>403</h1>');
    fs.readFile(file, (err, data) => {
        if (err) return status(res, 404, '<h1>404</h1>');
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        res.end(data);
    });
}

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch { return status(res, 400, '<h1>400 Bad Request</h1>'); }

    const pathname = (url.pathname !== '/' && url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname);

    try {
        // file tĩnh
        if (req.method === 'GET' && (pathname === '/style.css' || pathname === '/app.js' || pathname.startsWith('/public/'))) {
            const file = pathname.startsWith('/public/')
                ? path.join(PUBLIC_DIR, pathname.slice(8))
                : path.join(PUBLIC_DIR, pathname.slice(1));
            return serveStatic(res, file);
        }

        // session: đọc cookie, chưa có thì tạo mới cho khách
        let session = readSession(req);
        let newGuest = false;
        if (!session) { session = guestSession(res); newGuest = true; }

        const query = Object.fromEntries(url.searchParams.entries());
        let body = {};
        if (req.method === 'POST') {
            const ct = (req.headers['content-type'] || '').split(';')[0];
            if (ct === 'application/x-www-form-urlencoded' || ct === '') {
                body = Object.fromEntries(new URLSearchParams(await readBody(req)).entries());
            }
        }

        const hit = matchRoute(req.method, pathname);
        if (!hit) return notFound(res, pathname);

        // Truyền thêm forget/remember để route auth dùng mà không cần require server.
        const out = await hit.handler({
            req, res, session, query, body, params: hit.params,
            remember: () => remember(res, session), forget: () => forget(res),
            newGuest,
        });
        return send(res, out);
    } catch (err) {
        console.error(`[${req.method} ${pathname}]`, err);
        try { return status(res, 500, '<h1>500 Lỗi server</h1>'); }
        catch { /* header đã gửi */ }
    }
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`MiniShop chạy tại  →  http://localhost:${PORT}`);
        console.log(`Công tắc mặc định: "Bản đã sửa" (đổi được trên giao diện).`);
        console.log(`Cần dữ liệu gốc lại: node server.js --reset`);
        console.log(`Ctrl+C để dừng.`);
    });
}

module.exports = { route: (m, p, h) => routes.push({ method: m, pathname: p, handler: h }), server };
