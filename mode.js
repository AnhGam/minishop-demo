// Công tắc "Bản lỗi / Bản đã sửa".
//
// HỢP ĐỒNG dành cho P2, P3, P4 — chỉ đọc đúng 1 hàm này, không tự lấy session.mode:
//
//     const { getMode } = require('../mode');
//     const mode = getMode(req.session);   // 'vulnerable' | 'fixed'
//     if (mode === 'vulnerable') { ... }   // TODO(P2/P3/P4): viết bản lỗi
//
// Trạng thái nằm trên SERVER (session), nên mọi người mở cùng trang sẽ thấy cùng một bản,
// và không ai đổi được bằng cách sửa HTML trên trình duyệt.

const VALID = ['vulnerable', 'fixed'];

function normalize(value) {
    return VALID.includes(value) ? value : 'fixed';
}

function getMode(session) {
    if (!session) return 'fixed';
    return normalize(session.mode);
}

function setMode(session, value) {
    session.mode = normalize(value);
    return session.mode;
}

module.exports = { getMode, setMode, normalize };
