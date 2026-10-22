// Database cho MiniShop demo — dùng node:sqlite có sẵn trong Node 22+, KHONG can npm install.
// Chay reset:  node server.js --reset   (xoa file .db va seed lai tu dau)

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_FILE = path.join(__dirname, 'minishop.db');
const RESET = process.argv.includes('--reset');

if (RESET && fs.existsSync(DB_FILE)) fs.rmSync(DB_FILE);

const db = new DatabaseSync(DB_FILE);

// Constraint chi co y nghiem khi bat explicit (SQLite mac dinh TAT foreign_keys)
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    full_name  TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    phone      TEXT,
    address    TEXT,
    balance    REAL    NOT NULL DEFAULT 0 CHECK (balance >= 0),
    is_admin   INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    price       REAL    NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Moi don HANG gan voi 1 chu nhan (user_id). user_id KHONG NULL de IDOR ro rang.
CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    total      REAL    NOT NULL CHECK (total >= 0),
    address    TEXT    NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'NEW'
               CHECK (status IN ('NEW', 'PAID', 'SHIPPED', 'CANCELLED')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_prod  ON comments (product_id, created_at);
`);

// Seed chi chay khi DB trong -> reset giu duoc trang thai da demo sua doi
const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (count === 0) {
    const seed = db.transaction ? db.transaction(() => seedAll()) : seedAll;
    seed();
}

function seedAll() {
    const addUser = db.prepare(
        'INSERT INTO users (username, password, full_name, email, phone, address, balance, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    // Mat khau dang plain text CHO DEMO de P3 focus vao SQL injection.
    // Ban "da sua" that su phai hash (bcrypt/argon2) — KHONG dung cho production.
    addUser.run('user1', 'user1123', 'Nguyen Van User1', 'user1@minishop.local', '0901000001',
        '12 Le Loi, Quan 1, TP.HCM', 26500000, 0);
    addUser.run('user2', 'user2123', 'Tran Thi User2', 'user2@minishop.local', '0901000002',
        '456 Nguyen Hue, Quan 1, TP.HCM', 22200000, 0);
    addUser.run('admin', 'admin123', 'Quan Tri Vien', 'admin@minishop.local', '0901000003',
        'Trung tam, Quan 1, TP.HCM', 99999999, 1);

    const addProduct = db.prepare(
        'INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)'
    );
    addProduct.run('iPhone 15', 'Dien thoai Apple', 25000000, 50);
    addProduct.run('Samsung Galaxy S24', 'Flagship Android', 22000000, 30);
    addProduct.run('MacBook Air M3', 'Laptop mong nhe', 32000000, 20);

    // Don 101 thuoc user1, don 102 thuoc user2 — dung theo kich ban demo P2
    const addOrder = db.prepare(
        'INSERT INTO orders (id, user_id, total, address, status) VALUES (?, ?, ?, ?, ?)'
    );
    addOrder.run(101, 1, 26500000, '12 Le Loi, Quan 1, TP.HCM', 'PAID');
    addOrder.run(102, 2, 22200000, '456 Nguyen Hue, Quan 1, TP.HCM', 'NEW');

    const addComment = db.prepare(
        'INSERT INTO comments (product_id, user_id, content) VALUES (?, ?, ?)'
    );
    addComment.run(1, 2, 'San pham rat dep, giao nhanh!');
    addComment.run(1, 3, 'Hang chinh hang, da mua 2 lan.');
}

module.exports = db;
