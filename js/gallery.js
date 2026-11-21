/**
 * gallery.js — album.html（ギャラリー親ページ：イベント一覧）
 * イベントをクリックすると gallery-detail.html?id=xxx（写真一覧）へ移動します。
 * データは data/gallery.json（イベントの追加はJSONだけでOK）
 */
Site.ready(async () => {
  'use strict';
  const { esc } = Site;
  const B = window.Blog;
  const $ = id => document.getElementById(id);
  const grid = $('gallery-grid'), count = $('gallery-count'), search = $('gallery-search'), catBox = $('gallery-filters');

  const bc = B.breadcrumb([['Gallery', null]]);
  $('gallery-breadcrumb').innerHTML = bc.html;
  B.setSEO({ title: 'Gallery', description: document.querySelector('meta[name="description"]').content, canonicalPath: 'album.html', ld: [bc.ld] });

  let all;
  try { all = (await B.getGalleries()).list; }
  catch (err) { console.error(err); grid.innerHTML = B.loadError('gallery.json'); return; }

  // カテゴリボタンは、実際に使われているカテゴリだけ表示
  const used = [...new Set(all.map(g => g.category || ''))];
  const cats = [['All', 'すべて'], ...Object.entries(B.GALLERY_CATS).filter(([v]) => used.includes(v)),
    ...used.filter(v => !B.GALLERY_CATS[v]).map(v => [v, v || 'その他'])];
  let cat = new URLSearchParams(location.search).get('category') || 'All', q = '';
  catBox.innerHTML = cats.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === cat}">${esc(l)}</button>`).join('');

  function draw() {
    const terms = B.norm(q).split(/\s+/).filter(Boolean);
    const list = all.filter(g => (cat === 'All' || (g.category || '') === cat) && terms.every(t =>
      B.norm([g.title, g.description, g.catLabel, ...g.photos.map(p => p.caption || '')].join(' ')).includes(t)));
    const photos = list.reduce((n, g) => n + g.photos.length, 0);
    count.textContent = `${list.length} 件のイベント ／ 写真 ${photos} 枚`;
    grid.innerHTML = list.map(B.galleryCard).join('') || B.notice('該当するイベントはありません。');
  }
  catBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cat = b.dataset.v; catBox.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw();
  });
  search.addEventListener('input', () => { q = search.value; draw(); });
  draw();
});
