/**
 * gallery.js — album.html
 * 表示切替（すべて / カテゴリ別 / イベント別）・カテゴリ絞り込み・キーワード検索・ライトボックス
 * データは data/gallery.json（event 欄でイベントごとにまとまります）
 */
Site.ready(async () => {
  'use strict';
  const { esc, fmtDate, img } = Site;
  // [JSONのcategory値, 画面に出す名前]。表示名を変えたいときはここだけ編集
  const CATS = [['All', 'すべて'], ['Event', '新歓・イベント'], ['Competition', '大会'], ['Maintenance', '整備'],
    ['Practice', '練習会'], ['Camp', '合宿'], ['Meeting', 'ミーティング']];
  const MODES = [['all', '一覧'], ['category', 'カテゴリ別'], ['event', 'イベント別']];
  const $ = id => document.getElementById(id);
  const grid = $('gallery-grid'), count = $('gallery-count'), search = $('gallery-search');
  const catBox = $('gallery-filters'), modeBox = $('gallery-modes');
  const lb = $('lightbox'), lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption');
  let all = [], view = [], cat = 'All', mode = 'all', q = '', idx = 0, opener = null;

  try { all = (await Site.loadJSON('data/gallery.json')).sort(Site.byDateDesc); }
  catch (err) { console.error(err); grid.innerHTML = '<p class="notice">データを読み込めませんでした。gallery.json の書き方を確認してください。</p>'; return; }

  const pills = (box, items, current) => (box.innerHTML = items.map(([v, l]) =>
    `<button type="button" data-v="${v}" aria-pressed="${v === current}">${l}</button>`).join(''));
  pills(catBox, CATS, cat); pills(modeBox, MODES, mode);

  const card = (g, i) => `<article class="card"><button class="photo-btn" type="button" data-i="${i}" aria-label="「${esc(g.title)}」の写真を拡大表示">${img(g.image, g.title, '')}</button>
    <div class="card-body"><div class="meta"><time datetime="${esc(g.date)}">${fmtDate(g.date)}</time><span class="tag">${esc(g.category)}</span>${g.featured ? '<span class="tag tag-accent">注目</span>' : ''}</div>
    <h3>${esc(g.title)}</h3>${g.event ? `<p class="meta">イベント: ${esc(g.event)}</p>` : ''}<p>${esc(g.description)}</p><p class="meta">投稿者: ${esc(g.author)}</p></div></article>`;

  // 絞り込み → グループ化 → 表示。view は「画面に出ている順」で、ライトボックスの前後移動と一致させる
  function draw() {
    const k = q.trim().toLowerCase();
    const list = all.filter(g => (cat === 'All' || g.category === cat) &&
      (!k || [g.title, g.description, g.author, g.category, g.event].join(' ').toLowerCase().includes(k)));
    let groups = [['', list]];
    if (mode === 'category') {
      const known = CATS.slice(1).map(([v]) => v);
      groups = CATS.slice(1).map(([v, l]) => [l, list.filter(g => g.category === v)]);
      groups.push(['その他', list.filter(g => !known.includes(g.category))]);
    } else if (mode === 'event') {
      const m = new Map(); // list は新しい順なので、イベントも新しい順に並ぶ
      list.forEach(g => { const e = g.event || 'その他'; if (!m.has(e)) m.set(e, []); m.get(e).push(g); });
      groups = [...m];
    }
    groups = groups.filter(([, a]) => a.length);
    view = groups.flatMap(([, a]) => a);
    count.textContent = `${view.length} 件の記録`;
    let n = 0;
    grid.innerHTML = groups.map(([t, a]) => `${t ? `<h2 class="group-title">${esc(t)}<span>${a.length}件</span></h2>` : ''}
      <div class="grid grid-3">${a.map(g => card(g, n++)).join('')}</div>`).join('') || '<p class="notice">該当する記録はありません。</p>';
  }

  const show = i => {
    idx = (i + view.length) % view.length;
    const g = view[idx];
    lbImg.src = g.image; lbImg.alt = g.title;
    lbCap.innerHTML = `<strong>${esc(g.title)}</strong>${fmtDate(g.date)} ／ ${esc(g.category)}${g.event ? ' ／ ' + esc(g.event) : ''} ／ 投稿者: ${esc(g.author)}<br>${esc(g.description)}`;
  };
  const bind = (box, set) => box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    set(b.dataset.v); box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw();
  });
  bind(catBox, v => (cat = v)); bind(modeBox, v => (mode = v));
  search.addEventListener('input', () => { q = search.value; draw(); });
  grid.addEventListener('click', e => {
    const b = e.target.closest('.photo-btn'); if (!b) return;
    opener = b; show(+b.dataset.i); lb.showModal();
  });
  lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
  lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); }); // 背景クリックで閉じる
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); }); // Esc は <dialog> 標準で閉じる
  lb.addEventListener('close', () => opener && opener.focus());
  draw();
});
