/**
 * blog.js — ブログ（News）・ギャラリー共通の仕組み
 *  - data/news.json（記事）と data/gallery.json（ギャラリー）を読み込み、整形する
 *  - 記事カード・パンくず・タグ・ライトボックスなど共通部品
 *  - ページごとの title / meta description / canonical / OGP / 構造化データを設定
 *  - トップページの「News」「最新アルバム」「注目記事」を描画
 * ※ 記事やギャラリーの追加は JSON だけで行えます。このファイルを触る必要はありません。
 */
(() => {
  'use strict';
  const { SITE, esc, fmtDate, img, loadJSON, ready } = window.Site;

  const NEWS_JSON = 'data/news.json';
  const GALLERY_JSON = 'data/gallery.json';
  const SITE_JSON = 'data/site.json';        // 公開URLなど（任意）
  const BUILT_JSON = 'data/_generated.json'; // tools/build.py が自動作成（静的ページの一覧）
  const HOME_NEWS_LIMIT = 5, HOME_ALBUM_LIMIT = 6, HOME_FEATURED_LIMIT = 3;
  const EXCERPT_LENGTH = 90;

  // ギャラリーの category（英語）→ 画面表示名。記事の category は日本語をそのまま書く
  const GALLERY_CATS = { Event: '新歓・イベント', Competition: '大会', Maintenance: '整備', Practice: '練習会', Camp: '合宿', Meeting: 'ミーティング', Cars: '部車', Circuit: 'サーキット走行' };
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';

  /* ---------- 文字列処理 ---------- */
  // 全角/半角・大文字/小文字の違いを吸収して検索する
  const norm = s => String(s ?? '').normalize('NFKC').toLowerCase();
  const toText = c => Array.isArray(c) ? c.join('\n\n') : String(c ?? '');
  // 本文の記法（## 見出し・**太字** など）を取り除いたプレーンテキスト
  const plain = c => toText(c)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{2,4}|>|-|\*|\d+\.)\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ').trim();
  const cut = (s, n) => s.length > n ? s.slice(0, n).trimEnd() + '…' : s;

  // 本文の簡易記法 → HTML（先に全体をエスケープするので、HTMLタグは書けない＝安全）
  //   空行で段落 / 改行はそのまま改行 / ## 見出し / ### 小見出し / - 箇条書き / 1. 番号付き / > 引用
  //   **太字** / [リンク文字](https://...) / ![説明](images/...jpg) で画像
  const safeUrl = u => /^\s*(javascript|data|vbscript):/i.test(u) ? '#' : u;
  const inline = s => s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img class="post-inline-img" src="${safeUrl(u)}" alt="${a}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => /^https?:/i.test(u)
      ? `<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${t}</a>` : `<a href="${safeUrl(u)}">${t}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  function renderContent(content) {
    const blocks = esc(toText(content)).replace(/\r\n?/g, '\n').split(/\n\s*\n/);
    return blocks.map(b => {
      const t = b.trim(); if (!t) return '';
      const lines = t.split('\n');
      let m;
      if ((m = t.match(/^(#{2,4})\s+(.+)$/)) && lines.length === 1) { const lv = m[1].length; return `<h${lv}>${inline(m[2])}</h${lv}>`; }
      if (lines.every(l => /^\s*[-*]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
      if (lines.every(l => /^\s*\d+\.\s+/.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
      if (lines.every(l => /^&gt;\s?/.test(l))) return `<blockquote>${lines.map(l => inline(l.replace(/^&gt;\s?/, ''))).join('<br>')}</blockquote>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }

  /* ---------- URL ---------- */
  const q = (k, v) => `${k}=${encodeURIComponent(v)}`;
  const postUrl = id => `news-detail.html?${q('id', id)}`;
  const galleryUrl = id => `gallery-detail.html?${q('id', id)}`;
  const tagUrl = t => `news.html?${q('tag', t)}`;
  const catUrl = c => `news.html?${q('category', c)}`;

  /* ---------- 記事データの整形 ---------- */
  // 子記事の並び順：order（数字）→ 日付 → JSONに書いた順
  const childSort = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.date).localeCompare(String(b.date)) || a._i - b._i;
  const newestFirst = (a, b) => String(b.date).localeCompare(String(a.date)) || b._i - a._i;

  function preparePosts(raw) {
    const list = (Array.isArray(raw) ? raw : []).filter(p => p && p.id && p.title && !p.draft)
      .map((p, i) => ({ ...p, _i: i, tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []), images: (Array.isArray(p.images) ? p.images : []).map(x => typeof x === 'string' ? { src: x } : x).filter(x => x && x.src) }));
    const byId = new Map(list.map(p => [p.id, p]));
    list.forEach(p => {
      p.children = list.filter(c => c.parentId === p.id).sort(childSort);
      p.parent = p.parentId ? byId.get(p.parentId) || null : null;
    });
    list.forEach(p => {
      // 親の情報を引き継ぐ（子記事では category / date / thumbnail を省略できる）
      let a = p.parent; const chain = []; const seen = new Set([p.id]);
      while (a && !seen.has(a.id)) { chain.unshift(a); seen.add(a.id); a = a.parent; }
      p.ancestors = chain;
      const root = chain[0];
      if (!p.category && root) p.category = chain.map(x => x.category).filter(Boolean).pop();
      if (!p.category) p.category = 'お知らせ';
      if (!p.thumbnail) p.thumbnail = (p.images[0] && p.images[0].src) || chain.map(x => x.thumbnail).filter(Boolean).pop() || '';
    });
    // 親記事の日付を省略した場合は、子記事の最新日付を使う
    list.forEach(p => { if (!p.date && p.children.length) p.date = [...p.children].sort(newestFirst)[0].date || ''; });
    list.forEach(p => {
      p.text = plain(p.content);
      p.excerptText = p.excerpt || cut(p.text, EXCERPT_LENGTH);
      p.description = p.description || cut(p.text, 120) || `${p.title}｜${SITE.name}`;
      p.search = norm([p.title, p.text, p.category, p.tags.join(' '), p.ancestors.map(a => a.title).join(' ')].join(' '));
    });
    return { list: list.sort(newestFirst), byId };
  }

  /* ---------- ギャラリーデータの整形 ---------- */
  // photos: ["images/...jpg", {"src": "...", "caption": "..."}] と、
  // photoFolder: {"path": "images/gallery/xxx", "count": 42, "ext": "jpg"}（1.jpg〜42.jpg）の両方に対応
  function prepareGalleries(raw) {
    const list = (Array.isArray(raw) ? raw : []).filter(g => g && g.id && g.title && !g.draft).map((g, i) => {
      const photos = (Array.isArray(g.photos) ? g.photos : []).map(p => typeof p === 'string' ? { src: p } : p).filter(p => p && p.src);
      const f = g.photoFolder;
      if (f && f.path && f.count > 0) {
        const start = f.start || 1, pad = f.pad || 0, ext = (f.ext || 'jpg').replace(/^\./, '');
        for (let n = start; n < start + Number(f.count); n++) photos.push({ src: `${String(f.path).replace(/\/$/, '')}/${f.prefix || ''}${String(n).padStart(pad, '0')}.${ext}` });
      }
      return { ...g, _i: i, photos, cover: g.cover || (photos[0] && photos[0].src) || '', catLabel: GALLERY_CATS[g.category] || g.category || 'その他' };
    });
    return { list: list.sort(newestFirst), byId: new Map(list.map(g => [g.id, g])) };
  }

  let cache = {};
  const once = (k, fn) => cache[k] || (cache[k] = fn());
  const getPosts = () => once('posts', () => loadJSON(NEWS_JSON).then(preparePosts));
  const getGalleries = () => once('gal', () => loadJSON(GALLERY_JSON).then(prepareGalleries));
  const getSiteConf = () => once('site', () => loadJSON(SITE_JSON).catch(() => ({})));
  const getBuilt = () => once('built', () => loadJSON(BUILT_JSON).catch(() => ({})));

  /* ---------- HTML部品 ---------- */
  const tagLinks = (tags, cls = 'post-tags') => tags.length
    ? `<ul class="${cls}">${tags.map(t => `<li><a class="hash-tag" href="${tagUrl(t)}">#${esc(t)}</a></li>`).join('')}</ul>` : '';
  const catLink = c => `<a class="tag" href="${catUrl(c)}">${esc(c)}</a>`;
  const dateTag = d => d ? `<time datetime="${esc(d)}">${fmtDate(d).replace(/\./g, '/')}</time>` : '';

  const postCard = (p, mark = s => esc(s)) => `<article class="card post-card">
    ${img(p.thumbnail, '', 'card-img')}
    <div class="card-body"><div class="meta">${dateTag(p.date)}${catLink(p.category)}${p.important ? '<span class="badge-important">重要</span>' : ''}</div>
    ${p.parent ? `<p class="post-parent">${esc(p.parent.title)}</p>` : ''}
    <h3><a class="post-card-link" href="${postUrl(p.id)}">${mark(p.title)}</a></h3>
    <p>${esc(p.excerptText)}</p>
    ${p.children.length ? `<p class="post-children-count">関連記事 ${p.children.length}件</p>` : ''}
    ${tagLinks(p.tags)}
    <span class="read-more" aria-hidden="true">続きを読む ${ARROW}</span></div></article>`;

  const galleryCard = g => `<article class="card gallery-card">
    <div class="gallery-cover">${img(g.cover, '', 'card-img')}<span class="photo-count">${g.photos.length}<small>枚</small></span></div>
    <div class="card-body"><div class="meta">${dateTag(g.date)}<span class="tag">${esc(g.catLabel)}</span></div>
    <h3><a class="post-card-link" href="${galleryUrl(g.id)}">${esc(g.title)}</a></h3>
    ${g.description ? `<p>${esc(g.description)}</p>` : ''}<p class="post-children-count">${g.photos.length}枚の写真</p></div></article>`;

  // パンくず（items: [[表示名, URL or null], ...]）。構造化データ（BreadcrumbList）も返す
  function breadcrumb(items) {
    const all = [['Home', 'index.html'], ...items];
    const html = `<nav class="breadcrumb" aria-label="パンくずリスト"><ol>${all.map(([l, u], i) =>
      i === all.length - 1 || !u ? `<li><span aria-current="page">${esc(l)}</span></li>` : `<li><a href="${esc(u)}">${esc(l)}</a></li>`).join('')}</ol></nav>`;
    return { html, ld: { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: all.map(([l, u], i) => ({ '@type': 'ListItem', position: i + 1, name: l, ...(u ? { item: new URL(u, document.baseURI).href } : {}) })) } };
  }

  /* ---------- SEO（title / description / canonical / OGP / 構造化データ） ---------- */
  const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
  async function setSEO({ title, description, image, canonicalPath, ld = [], noindex = false }) {
    const conf = await getSiteConf();
    const base = String(conf.baseUrl || '').replace(/\/$/, '');
    const abs = u => !u ? '' : /^https?:/i.test(u) ? u : (base && !base.includes('YOUR-DOMAIN') ? `${base}/${u.replace(/^\//, '')}` : new URL(u, document.baseURI).href);
    const full = `${title} | ${SITE.name}`;
    document.title = full;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', full); setMeta('meta[name="twitter:title"]', 'content', full);
    setMeta('meta[property="og:description"]', 'content', description); setMeta('meta[name="twitter:description"]', 'content', description);
    if (image) { setMeta('meta[property="og:image"]', 'content', abs(image)); setMeta('meta[name="twitter:image"]', 'content', abs(image)); }
    if (canonicalPath) { setMeta('link[rel="canonical"]', 'href', abs(canonicalPath)); setMeta('meta[property="og:url"]', 'content', abs(canonicalPath)); }
    let robots = document.querySelector('meta[name="robots"]');
    if (noindex && !robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    if (robots) robots.content = noindex ? 'noindex' : 'index,follow';
    document.querySelectorAll('script[data-blog-ld]').forEach(s => s.remove());
    ld.forEach(obj => { const s = document.createElement('script'); s.type = 'application/ld+json'; s.dataset.blogLd = ''; s.textContent = JSON.stringify(obj); document.head.appendChild(s); });
  }
  // 静的ページ（tools/build.py で生成）があればそちらを正規URLにする
  async function canonicalFor(kind, id) {
    const built = await getBuilt();
    return (built[kind] || []).includes(id) ? `${kind}/${encodeURIComponent(id)}.html` : (kind === 'news' ? postUrl(id) : galleryUrl(id));
  }

  /* ---------- ライトボックス（写真の拡大表示） ---------- */
  // album.html と同じ <dialog id="lightbox"> を使う
  function lightbox(dialog) {
    if (!dialog) return { open() {} };
    const im = dialog.querySelector('img'), cap = dialog.querySelector('figcaption');
    let items = [], idx = 0, opener = null;
    const show = i => {
      idx = (i + items.length) % items.length; const it = items[idx];
      im.src = it.src; im.alt = it.caption || '';
      cap.innerHTML = `${it.caption ? `<strong>${esc(it.caption)}</strong>` : ''}${it.author ? `撮影: ${esc(it.author)} ／ ` : ''}${idx + 1} / ${items.length}`;
    };
    dialog.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
    dialog.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
    dialog.addEventListener('close', () => opener && opener.focus());
    return { open(list, i, from) { items = list; opener = from; show(i); dialog.showModal(); } };
  }
  const photoGrid = (photos, label) => `<div class="photo-grid">${photos.map((p, i) =>
    `<button class="photo-btn" type="button" data-i="${i}" aria-label="${esc(label)}の写真 ${i + 1} を拡大表示">${img(p.src, p.caption || '', '')}</button>`).join('')}</div>`;

  /* ---------- サイドバー（記事検索・カテゴリー・記事の階層・タグ・最新記事） ---------- */
  const countBy = (arr, key) => arr.reduce((m, x) => (key(x).forEach(k => m.set(k, (m.get(k) || 0) + 1)), m), new Map());
  function sidebarHTML(list, { currentId = '', q = '', tag = '', category = '' } = {}) {
    const cats = [...countBy(list, p => [p.category])];
    const tags = [...countBy(list, p => p.tags)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));
    const tree = (p, depth = 0) => `<li${p.id === currentId ? ' class="is-current"' : ''}><a href="${postUrl(p.id)}"${p.id === currentId ? ' aria-current="page"' : ''}>${esc(p.title)}</a>${
      p.children.length && depth < 4 ? `<ul>${p.children.map(c => tree(c, depth + 1)).join('')}</ul>` : ''}</li>`;
    // 子記事を持つ親記事（＝シリーズ）をカテゴリーごとに木構造で表示
    const roots = list.filter(p => !p.parent && p.children.length);
    const treeCats = [...new Set(roots.map(p => p.category))];
    return `<form class="side-box side-search" role="search" action="news.html"><h2 class="side-title"><label for="side-q">記事を検索</label></h2>
      <span class="search-field"><input id="side-q" name="q" type="search" value="${esc(q)}" placeholder="キーワード"><button class="button button-primary" type="submit" aria-label="検索">${ARROW}</button></span></form>
    <div class="side-box"><h2 class="side-title">カテゴリー</h2><ul class="side-list">${cats.map(([c, n]) =>
      `<li><a href="${catUrl(c)}"${c === category ? ' aria-current="true"' : ''}>${esc(c)}<span>${n}</span></a></li>`).join('')}</ul></div>
    ${roots.length ? `<div class="side-box"><h2 class="side-title">記事の階層</h2>${treeCats.map(c =>
      `<p class="side-sub">${esc(c)}</p><ul class="side-tree">${roots.filter(p => p.category === c).map(p => tree(p)).join('')}</ul>`).join('')}</div>` : ''}
    ${tags.length ? `<div class="side-box"><h2 class="side-title">タグ</h2><ul class="post-tags tag-cloud">${tags.map(([t, n]) =>
      `<li><a class="hash-tag"${t === tag ? ' aria-current="true"' : ''} href="${tagUrl(t)}">#${esc(t)}<span>${n}</span></a></li>`).join('')}</ul></div>` : ''}
    <div class="side-box"><h2 class="side-title">最新記事</h2><ul class="side-recent">${list.slice(0, 5).map(p =>
      `<li><a href="${postUrl(p.id)}">${dateTag(p.date)}<span>${esc(p.title)}</span></a></li>`).join('')}</ul></div>`;
  }

  const notice = msg => `<p class="notice">${msg}</p>`;
  const loadError = file => notice(`データを読み込めませんでした。${esc(file)} の書き方（カンマ・引用符）を確認してください。手元で確認する場合は簡易サーバー経由で開く必要があります。`);

  window.Blog = {
    ARROW, NEWS_JSON, GALLERY_JSON, GALLERY_CATS, norm, renderContent, postUrl, galleryUrl, tagUrl, catUrl,
    getPosts, getGalleries, newestFirst, postCard, galleryCard, tagLinks, catLink, dateTag, breadcrumb,
    setSEO, canonicalFor, lightbox, photoGrid, sidebarHTML, notice, loadError,
    // 表示中ページの記事ID（?id=xxx、または静的ページの <body data-id="xxx">）
    currentId: () => new URLSearchParams(location.search).get('id') || document.body.dataset.id || ''
  };

  /* ---------- トップページ（index.html） ---------- */
  ready(() => {
    const news = document.getElementById('news-list');
    const album = document.getElementById('latest-album');
    const feat = document.getElementById('featured');
    if (news || feat) getPosts().then(({ list }) => {
      if (news) news.innerHTML = list.length ? `<ul class="news-list">${list.slice(0, HOME_NEWS_LIMIT).map(p =>
        `<li class="news-item${p.important ? ' is-important' : ''}">${dateTag(p.date)}${p.important ? '<span class="badge-important">重要</span>' : ''}<a class="news-title" href="${postUrl(p.id)}">${p.parent ? `<span class="news-parent">${esc(p.parent.title)}</span>` : ''}${esc(p.title)}</a></li>`).join('')}</ul>` : notice('お知らせはありません。');
      if (feat) {
        const f = list.filter(p => p.featured).slice(0, HOME_FEATURED_LIMIT);
        feat.innerHTML = f.length ? f.map(p => postCard(p)).join('') : notice('注目記事は準備中です。');
      }
    }).catch(err => { console.error(err); [news, feat].forEach(e => e && (e.innerHTML = loadError('news.json'))); });
    if (album) getGalleries().then(({ list }) => {
      album.innerHTML = list.slice(0, HOME_ALBUM_LIMIT).map(galleryCard).join('') || notice('写真は準備中です。');
    }).catch(err => { console.error(err); album.innerHTML = loadError('gallery.json'); });
  });
})();
