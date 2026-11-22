// Trang mở đầu + bộ sưu tập (thuộc P1).
// Chi tiết sản phẩm + khối bình luận: P4 (Case 3: XSS) vẽ nội dung bình luận.

const db = require('../db');
const { page, esc, html, money } = require('../helpers');
const { getMode } = require('../mode');

const LOOK = {
    'iPhone 18': { photo: '/img/iphone-18.jpg', blurb: 'Mặt kính trắng, khung titan.', spec: '256 GB · Trắng' },
    'iPhone 15': { photo: '/img/iphone-15.jpg', blurb: 'Điện thoại Apple.', spec: '128 GB · Đen' },
    'Samsung Galaxy S24': { photo: '/img/galaxy-s24.jpg', blurb: 'Flagship Android.', spec: '256 GB · Xám' },
    'MacBook Air M3': { photo: '/img/macbook-air.jpg', blurb: 'Laptop mỏng nhẹ.', spec: '16 GB · Bạc' },
};

function look(product) {
    return LOOK[product.name] || {
        photo: '',
        blurb: product.description || '',
        spec: '',
    };
}

function kindOf(name) {
    if (/macbook|laptop/i.test(name)) return 'Laptop';
    if (/iphone|galaxy|samsung/i.test(name)) return 'Điện thoại';
    return 'Máy';
}

function card(product) {
    const item = look(product);
    const href = `/product/${product.id}`;
    const photo = item.photo
        ? `<img src="${item.photo}" alt="${esc(product.name)}" width="800" height="800">`
        : '';
    return `<article class="card">
  <a class="card-photo" href="${href}" aria-label="${esc(product.name)}">${photo}</a>
  <div class="card-top">
    <p class="card-price">${money(product.price)}</p>
    <span class="card-kind">${kindOf(product.name)}</span>
  </div>
  <h2 class="card-name"><a href="${href}">${esc(product.name)}</a></h2>
  ${item.blurb ? `<p class="card-blurb">${esc(item.blurb)}</p>` : ''}
  <a class="card-buy" href="${href}">Xem máy</a>
</article>`;
}

function landing(session, products) {
    const hero = products.find((p) => p.name === 'iPhone 18') || products[0] || {
        id: null,
        name: 'iPhone 18',
        price: 34990000,
        stock: 12,
    };
    const heroLook = look(hero);
    const see = hero.id ? `/product/${hero.id}` : '/products';
    const signedIn = session && session.user;
    const parts = String(heroLook.spec || '').split('·').map((s) => s.trim()).filter(Boolean);
    const facts = [];
    if (parts[0]) facts.push(parts[1] ? ['Bộ nhớ', parts[0]] : ['Cấu hình', parts[0]]);
    if (parts[1]) facts.push(['Màu', parts[1]]);
    facts.push(['Giá', money(hero.price)]);

    const others = products.filter((p) => p.id !== hero.id);
    const wide = others.find((p) => /macbook/i.test(p.name));
    const upright = others.filter((p) => p !== wide);
    const shots = [hero, upright[0], wide || upright[1]].filter(Boolean);
    const pose = ['still-main', 'still-side', 'still-low'];
    const still = shots.map((p, i) => {
        const photo = look(p).photo;
        if (!photo) return '';
        const href = p.id ? `/product/${p.id}` : '/products';
        return `<a class="${pose[i]}" href="${href}" aria-label="${esc(p.name)}"><img src="${photo}" alt="${esc(p.name)}" width="900" height="900"></a>`;
    }).join('\n');

    const side = products.map((p) => {
        const mark = p.id === hero.id ? ' aria-current="true"' : '';
        return `<a href="/product/${p.id}"${mark}>${esc(p.name)}</a>`;
    }).join('');

    const actions = signedIn
        ? `<a class="poster-cta" href="${see}">Xem máy</a>`
        : `<a class="poster-cta" href="/login">Đăng nhập</a>
           <a class="poster-quiet" href="/register">Tạo tài khoản</a>`;

    const factHtml = facts.map(([label, value]) => {
        const swatch = label === 'Màu' ? '<i class="swatch" aria-hidden="true"></i>' : '';
        return `<p class="poster-fact"><span>${label}</span><b>${swatch}${esc(value)}</b></p>`;
    }).join('');

    const body = `
<section class="poster">
  <nav class="poster-side" aria-label="Sản phẩm trong cửa hàng">${side}</nav>
  <div class="poster-copy">
    <p class="poster-kicker">${esc(heroLook.spec || 'MiniShop')}</p>
    <h1>${esc(hero.name)}</h1>
    ${heroLook.blurb ? `<p class="poster-lead">${esc(heroLook.blurb)}</p>` : ''}
    ${factHtml}
    <div class="poster-actions">${actions}</div>
  </div>
  <div class="still">
    <p class="ghost" aria-hidden="true">MiniShop</p>
    ${still}
  </div>
  <div class="poster-card">
    <p class="poster-kicker">${esc(hero.name)}</p>
    <p>${esc(heroLook.blurb || heroLook.spec || '')}</p>
    <a class="learn" href="${see}">Xem máy <span aria-hidden="true">→</span></a>
  </div>
</section>`;
    return page('Trang mở đầu', body, session, '/');
}

function catalog(session, products) {
    const body = `
<header class="collection">
  <p class="collection-kicker">MiniShop</p>
  <h1>Bộ sưu tập</h1>
  <p class="lede">${products.length} máy trong cửa hàng</p>
</header>
<div class="gallery">
${products.map(card).join('\n')}
</div>`;
    return page('Bộ sưu tập', body, session, '/products');
}

module.exports = function (route) {
    route('GET', '/', ({ session }) => {
        const products = db.prepare('SELECT id, name, description, price, stock FROM products ORDER BY id').all();
        return landing(session, products);
    });

    route('GET', '/products', ({ session }) => {
        const products = db.prepare('SELECT id, name, description, price, stock FROM products ORDER BY id').all();
        return catalog(session, products);
    });

    route('GET', '/product/:id', ({ session, params }) => {
        const id = Number(params.id);
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!product) {
            return html(404, page('Không tìm thấy', '<div class="notice warn"><h1>404</h1><p>Sản phẩm không có trong cửa hàng.</p><p><a class="btn" href="/products">Về bộ sưu tập</a></p></div>', session, '/products'));
        }

        const mode = getMode(session);
        const comments = db.prepare(`
            SELECT c.content, u.username, u.full_name, c.created_at
            FROM comments c JOIN users u ON u.id = c.user_id
            WHERE c.product_id = ? ORDER BY c.id`).all(id);

        let commentsHtml;
        if (mode === 'vulnerable') {
            commentsHtml = `
<ul class="comments">
${comments.map((c) => `
  <li class="comment">
    <b>${esc(c.full_name)}</b> <span class="muted">@${esc(c.username)} · ${esc(c.created_at)}</span>
    <p>${c.content}</p>
  </li>`).join('\n')}
</ul>`;
        } else {
            commentsHtml = `
<ul class="comments">
${comments.map((c) => `
  <li class="comment">
    <b>${esc(c.full_name)}</b> <span class="muted">@${esc(c.username)} · ${esc(c.created_at)}</span>
    <p>${esc(c.content)}</p>
  </li>`).join('\n')}
</ul>`;
        }

        const item = look(product);
        const photo = item.photo
            ? `<img src="${item.photo}" alt="${esc(product.name)}" width="900" height="900">`
            : '';
        const composer = session && session.user
            ? `<form method="post" action="/product/${id}/comment" class="form comment-form">
    <textarea name="content" rows="3" placeholder="Viết vài dòng về máy này..." required maxlength="500"></textarea>
    <button class="btn">Gửi bình luận</button>
  </form>`
            : `<p class="quiet ask"><a href="/login">Đăng nhập</a> để để lại bình luận.</p>`;

        const body = `
<a class="back" href="/products">← Bộ sưu tập</a>
<div class="product-view">
  <div class="product-photo">${photo}</div>
  <div class="product-copy">
    <div class="card-top">
      <p class="card-price">${money(product.price)}</p>
      <span class="card-kind">${kindOf(product.name)}</span>
    </div>
    <h1>${esc(product.name)}</h1>
    ${item.blurb ? `<p class="card-blurb">${esc(item.blurb)}</p>` : ''}
    ${item.spec ? `<p class="product-spec">${esc(item.spec)}</p>` : ''}
    <p class="stock">Còn ${product.stock} máy</p>
  </div>
</div>
<section class="comments-section">
  <h2>Bình luận</h2>
  ${comments.length ? commentsHtml : '<p class="quiet">Chưa có bình luận.</p>'}
  ${composer}
</section>`;
        return page(product.name, body, session, '/products');
    });
};
