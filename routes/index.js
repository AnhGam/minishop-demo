// Đăng ký toàn bộ chức năng.
// Thêm route mới: tạo file trong routes/ rồi thêm 1 dòng require ở đây.

module.exports = function (route) {
    require('./auth')(route);        // đăng nhập / thoát / công tắc bản demo
    require('./products')(route);    // trang chủ, danh sách sản phẩm
    require('./orders')(route);      // danh sách đơn + CHI TIẾT ĐƠN  ← P2 (Case 1: IDOR)
    require('./comments')(route);    // bình luận sản phẩm           ← P4 (Case 3: XSS)
    require('./profile')(route);     // trang cá nhân (đích sau đăng nhập)
};
