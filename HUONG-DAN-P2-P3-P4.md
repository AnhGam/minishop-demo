# Hướng dẫn cho P2, P3, P4

Server đã chạy sẵn. Mở http://localhost:3000 → đăng nhập bằng bảng dưới.

## Tài khoản

| username | password | vai trò |
|----------|----------|---------|
| `user1` | `user1123` | chủ đơn 101, địa chỉ `12 Le Loi, Quan 1, TP.HCM`, số dư 26.500.000 |
| `user2` | `user2123` | chủ đơn 102, địa chỉ `456 Nguyen Hue, Quan 1, TP.HCM`, số dư 22.200.000 |
| `admin` | `admin123` | quản trị, số dư 99.999.999 |

## Công tắc trên màn hình

Thanh vàng giữa màn hình, nút **Bản lỗi** / **Bản đã sửa**.

Lựa chọn nằm trên **server** (session), không phải trên trình duyệt. Nên:
- bấm nút là toàn bộ server đổi cách xử lý ngay, khỏi sửa code
- khán giả không đổi được bằng cách sửa HTML trên trình duyệt
- **restart server thì công tắc về lại "Bản đã sửa"** (session cất trong RAM)

## Quy tắc chung cho cả 3 người

**Không được tách ra 2 file server riêng.** Hai nhánh phải nằm trong **cùng một hàm**, chọn theo công tắc của P1. Bấm nút là đổi lối xử lý, không cần restart.

Đọc công tắc bằng đúng 1 hàm này, đừng tự lấy `session.mode`:

```js
const { getMode } = require('../mode');

// mode là 'vulnerable' hoặc 'fixed'
const mode = getMode(session);

if (mode === 'vulnerable') {
    // viết bản lỗi ở đây
} else {
    // viết bản đã sửa ở đây
}
```

Handler trả về 1 trong 3 dạng:

```js
return page('Tiêu đề', '<p>HTML</p>', session);   // chuỗi HTML
return { redirect: '/orders' };                    // chuyển trang
return html(403, page('...', '<p>Từ chối</p>', session));  // HTML kèm mã lỗi
```

Xuất dữ liệu của người dùng ra HTML thì **luôn** qua `esc()` — trừ khi bạn đang cố tình demo bản lỗi.

Muốn thêm route mới: thêm 1 dòng `require('./ten-file')(route)` trong `routes/index.js`.
Route có thể có tham số: `route('GET', '/product/:id', ...)` rồi đọc `params.id`.

---

# P2 — Case 1: xem đơn hàng người khác (IDOR)

## Ở đâu

Mở `routes/orders.js`, tìm dòng ghi:

```js
// ===== P2: VIẾT LOGIC Ở ĐÂY =====
```

Bên trong đã có sẵn khung 2 nhánh và gợi ý bằng chú thích.

## Việc cần làm

Viết nhánh `mode === 'vulnerable'`: chỉ tìm đơn theo `id`, **không** kiểm tra chủ đơn.

```js
if (mode === 'vulnerable') {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return html(404, page('Đơn hàng', '<div class="box warn"><h1>404</h1></div>', session));
    return page('Đơn hàng #' + order.id, `<h1>Đơn hàng #${order.id}</h1>
        <p>Địa chỉ giao: ${esc(order.address)}</p>`, session);
}
```

Bản đã sửa ở ngay dưới đã chạy được — cứ coi đó là mẫu để viết bản lỗi cho khớp.

## Tập diễn

1. Đăng nhập `user1`
2. Vào **Đơn hàng** → bấm xem đơn 101 → thấy địa chỉ của mình
3. Sửa thanh địa chỉ thành `?id=102` → **thấy địa chỉ nhà của user2**
4. Bấm **Bản đã sửa** → cùng URL đó bị từ chối 403: "Bạn không có quyền xem đơn hàng này!"

## Câu cần nói trên sân khấu

Server biết user1 đã đăng nhập, nhưng không kiểm tra user1 **có quyền** xem dữ liệu đó hay không. Đó là Broken Access Control. Tức là: *Authentication* (bạn là ai) khác *Authorization* (bạn được phép làm gì).

---

# P3 — Case 2: đăng nhập bằng câu SQL bị ghép chuỗi (SQLi)

## Ở đâu

Mở `routes/auth.js`, tìm hàm `function loginHandler`.

Nhánh `mode === 'vulnerable'` hiện đang trả trang "chưa làm". Viết lại thành ghép chuỗi.

## Việc cần làm

Bản lỗi: nối username và password thẳng vào câu SQL.

```js
if (mode === 'vulnerable') {
    const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
    const user = db.prepare(sql).get();   // câu SQL đã bị thay đổi nghĩa bởi input
    if (!user) return loginPage(session, 'Sai tài khoản hoặc mật khẩu', username);
    session.userId = user.id;
    session.user = { id: user.id, username: user.username, full_name: user.full_name, is_admin: !!user.is_admin };
    remember();
    return { redirect: '/profile' };
}
```

Nhánh `else` ngay bên dưới là bản đã sửa: câu SQL có dấu `?`, dữ liệu truyền riêng.

## Payload dùng để demo

Ô **username**, nhập chuỗi:

```
admin' -- 
```

Còn ô **password** thì gõ bừa vài ký tự, ví dụ `xxx`.

Với bản lỗi, câu SQL trở thành

```sql
SELECT * FROM users WHERE username = 'admin' -- ' AND password = 'xxx'
```

Phần sau `--` bị SQLite coi là chú thích nên bị bỏ đi. Điều kiện mật khẩu biến mất → đăng nhập được vào **admin**. Trang cá nhân sẽ hiện rõ bạn đang vào bằng tài khoản quản trị.

Bấm **Bản đã sửa** rồi nhập lại đúng chuỗi đó → báo "Sai tài khoản hoặc mật khẩu", vì chuỗi lúc này chỉ là một cái tên không tồn tại chứ không còn phá được cú pháp câu lệnh.

## Tập diễn

1. Đăng nhập đúng trước: `user1` / `user1123` → chạy bình thường
2. Thoát ra, nhập payload ở ô username, password gõ bừa → vào được admin
3. Bấm **Bản đã sửa** → cùng chuỗi đó bị báo sai

---

# P4 — Case 3: bình luận chạy script (Stored XSS)

## Ở hai chỗ

1. `routes/products.js` — chỗ vẽ danh sách bình luận. Tìm `// P4: thay đoạn vẽ bình luận ở đây.`
2. `public/app.js` — hàm `renderComments`, nếu muốn demo cách vẽ trên trình duyệt.

Server **lưu nguyên văn** nội dung bình luận (xem `routes/comments.js`) và không sửa gì lúc lưu. Điểm khác nhau duy nhất nằm ở chỗ **vẽ ra màn hình**.

## Việc cần làm

Bản lỗi: đổ nội dung vào HTML không escape.

```js
if (mode === 'vulnerable') {
    commentsHtml = `<ul class="comments">${comments.map((c) => `
      <li class="comment"><b>${esc(c.full_name)}</b>
      <p>${c.content}</p></li>`).join('\n')}</ul>`;   // ${c.content} KHÔNG có esc()
}
```

Bản đã sửa (ở dưới, đã chạy được): dùng `esc(c.content)`.

## Payload dùng để demo

Bình luận bình thường trước: `Sản phẩm rất đẹp!`

Rồi gửi chuỗi:

```
<script>alert('XSS! Cookie: ' + document.cookie)</script>
```

Với bản lỗi, tải lại trang (hoặc mở bằng trình duyệt khác) → hộp thoại alert nhảy ra. Bấm **Bản đã sửa**, tải lại → chuỗi đó hiện thành chữ thuần, không chạy.

## Tập diễn

1. Gửi bình luận bình thường → hiện đúng chữ
2. Gửi chuỗi script → alert nhảy ra
3. Bấm **Bản đã sửa**, tải lại → chỉ còn chữ

---

# Trước khi lên sân khấu

```bash
node server.js --reset
```

Xoá DB và seed lại từ đầu, cho sạch dữ liệu mà mấy lần diễn thử để lại.

## Kiểm tra mình có làm hỏng khung của P1 không

```bash
node test/smoke.js
```

28 kiểm tra tự động: đăng nhập, 403, 404, escape XSS, công tắc, logout. Khi bạn sửa xong nhánh bản lỗi thì **một số kiểm tra sẽ đỏ là đúng** — vì lúc đó app đang ở chế độ bản lỗi và cố tình không chặn. Việc của bạn là đảm bảo **cả hai nhánh đều chạy đúng ý muốn**.

Nếu kiểm tra đỏ mà bạn không rõ nguyên nhân, gõ cho tôi dòng lỗi.

## Nếu trình chiếu bị lỗi

Chạy `node server.js --reset` rồi F5 lại trang. Nhớ bấm công tắc đúng bản mình định demo, vì **công tắc nhớ theo trình duyệt, restart server là mất**.

## Mật khẩu đang để plain text

Đây là cố ý, để P3 tập trung vào SQL injection chứ không bị phân tâm bởi phần hash. Bản thật phải hash bằng bcrypt/argon2 — nếu có ai hỏi trên sân khấu thì trả lời như vậy.
