# MiniShop — khung demo (P1)

Khung web app cho seminar "Bảo mật Web Application". **P1** dựng phần khung; **P2, P3, P4** viết logic ba case.

## Chạy

```bash
node server.js
```

Mở http://localhost:3000

Không cần `npm install`. Không cần cài database. Chỉ cần **Node 22+** (Node 24 ở máy này).

```bash
node server.js --reset     # xóa DB, seed lại từ đầu (dùng trước mỗi buổi diễn)
PORT=4000 node server.js   # đổi cổng
```

## Tài khoản demo (đã có sẵn)

| username | password | vai trò |
|----------|----------|---------|
| `user1` | `user1123` | chủ đơn 101 |
| `user2` | `user2123` | chủ đơn 102 |
| `admin` | `admin123` | quản trị |

## Công tắc "Bản lỗi / Bản đã sửa"

Nút nằm trên thanh vàng giữa màn hình. Lựa chọn được gửi xuống **server** (session), nên mọi người mở cùng trang đều thấy cùng một bản, và không ai đổi được bằng cách sửa HTML trên trình duyệt.

Trạng thái nằm ở session → **restart server là mất**, quay về mặc định "Bản đã sửa".

## Hợp đồng cho P2, P3, P4

Chỉ đọc đúng 1 hàm, **không** tự đọc `session.mode`:

```js
const { getMode } = require('../mode');
const mode = getMode(req.session);      // 'vulnerable' | 'fixed'

if (mode === 'vulnerable') { /* ... */ }  // viết bản lỗi
else { /* ... */ }                       // viết bản đã sửa
```

Handler trả về: chuỗi HTML, `{ redirect: '/...' }`, hoặc `{ code: 403, html }`.

Thêm route mới: thêm 1 dòng `require('./ten-file')(route)` trong `routes/index.js`.

## Việc của từng người

| Ai | Làm gì | Ở đâu |
|----|--------|-------|
| **P1** (đã xong) | Khung app, menu, công tắc, DB, dữ liệu mẫu | toàn bộ trừ 3 file dưới |
| **P2** | Case 1 IDOR — `/order?id=` | `routes/orders.js`, tìm `// ===== P2: VIẾT LOGIC Ở ĐÂY =====` |
| **P3** | Case 2 SQL Injection — đăng nhập | `routes/auth.js`, tìm `function loginHandler` |
| **P4** | Case 3 Stored XSS — bình luận | `routes/products.js` (vẽ bình luận) + `public/app.js` |

Mỗi chỗ đều có `TODO(...)` ghi rõ cần viết gì. Bản "đã sửa" đã chạy được sẵn để P2/P3/P4 tham khảo — họ có thể giữ hoặc viết lại theo style của mình.

**Quy ước:** hai nhánh `vulnerable` / `fixed` phải nằm trong **cùng một hàm**, chọn theo công tắc. Không được tách ra 2 file server riêng, vì người diễn không được phải sửa code giữa chừng.

## Kiểm tra nhanh

```bash
node test/smoke.js
```

Chạy server trên cổng 3100, kiểm tra toàn bộ luồng, tắt server. Dùng để biết mình có làm hỏng khung của P1 hay không.

## Dữ liệu mẫu đã seed

- 3 user: `user1`, `user2`, `admin`
- Đơn `101` thuộc `user1`, đơn `102` thuộc `user2` (có địa chỉ nhà)
- 3 sản phẩm, 2 bình luận mẫu

## Lưu ý bảo mật (để tránh hiểu nhầm khi demo)

- Mật khẩu để **plain text cho có chủ đích** — để P3 tập trung vào SQL injection. Bản thật phải hash.
- Session dựa trên cookie có chữ ký HMAC, lưu trong RAM. Đủ cho demo chạy trên `localhost`, không đủ cho production (mất session khi restart, không chịu nổi nhiều người dùng thật).
- `SameSite=Strict` đã bật để chống CSRF cho các POST của app.

## Cấu trúc

```
minishop/
├── server.js          # node:http + router + session, không dependency
├── db.js              # node:sqlite: schema, constraint, seed
├── helpers.js         # escape, layout, menu, công tắc
├── mode.js            # HỢP ĐỒNG getMode/setMode cho P2, P3, P4
├── middleware.js      # requireLogin, deny
├── routes/            # 1 file / chức năng
│   ├── index.js       # ← thêm dòng require ở đây
│   ├── auth.js        # đăng nhập (P3) + công tắc (P1)
│   ├── products.js    # trang chủ (P1) + vẽ bình luận (P4)
│   ├── orders.js      # danh sách đơn (P1) + CHI TIẾT ĐƠN (P2)
│   ├── comments.js    # nhận + lưu bình luận (khuôn cho P4)
│   └── profile.js     # trang cá nhân, đích sau đăng nhập
├── public/
│   ├── style.css      # giao diện
│   └── app.js         # renderComments (thuần textContent)
├── test/smoke.js      # kiểm tra tự động
└── minishop.db        # SQLite — sinh tự động, xoá được bất cứ lúc nào
```
