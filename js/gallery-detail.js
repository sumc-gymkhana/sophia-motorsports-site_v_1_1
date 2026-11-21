/**
 * gallery-detail.js — ギャラリー詳細（gallery-detail.html?id=xxx ／ 静的ページ gallery/xxx.html）
 * イベントの写真一覧・ライトボックス・関連記事へのリンク・前後のイベント
 */
Site.ready(async () => {
  'use strict';
  const { esc } = Site;
  const B = window.Blog;
  const hero = document.getElementById('gallery-hero'), main = document.getElementById('gallery-main');

  let data;
  try { data = await B.getGalleries(); }
  catch (err) { console.error(err); main.innerHTML = B.loadError('gallery.json'); return; }
  let posts = null;
  try { posts = (await B.getPosts()).byId; } catch { /* 記事が読めなくても写真は表示する */ }

  const { list, byId } = data;
  const id = B.currentId();
  const g = byId.get(id);
  if (!g) {
    hero.innerHTML = `${B.breadcrumb([['Gallery', 'album.html'], ['見つかりません', null]]).html}<p class="eyebrow eyebrow-light">Gallery</p><h1>アルバムが見つかりません</h1>`;
    main.innerHTML = B.notice(`アルバム「${esc(id)}」は見つかりませんでした。<a class="text-link" href="album.html">ギャラリー一覧へ ${B.ARROW}</a>`);
    B.setSEO({ title: 'アルバムが見つかりません | Gallery', description: '指定されたアルバムは見つかりませんでした。', noindex: true });
    return;
  }

  const bc = B.breadcrumb([['Gallery', 'album.html'], [g.title, null]]);
  hero.innerHTML = `${bc.html}<div class="meta post-meta">${B.dateTag(g.date)}<a class="tag" href="album.html?category=${encodeURIComponent(g.category || '')}">${esc(g.catLabel)}</a><span class="hero-count">${g.photos.length}枚</span></div>
    <h1>${esc(g.title)}</h1>${g.description ? `<p>${esc(g.description)}</p>` : ''}`;

  const article = g.articleId && posts && posts.get(g.articleId);
  const i = list.indexOf(g), prev = list[i + 1], next = list[i - 1]; // list は新しい順
  main.innerHTML = `${article ? `<a class="gallery-link" href="${B.postUrl(article.id)}">${Site.img(article.thumbnail, '', '')}<span><small>関連記事</small><strong>${esc(article.title)}</strong>記事を読む ${B.ARROW}</span></a>` : ''}
    ${g.photos.length ? B.photoGrid(g.photos, g.title) : B.notice('写真は準備中です。')}
    <nav class="post-pager" aria-label="前後のアルバム">
      ${prev ? `<a class="pager-prev" href="${B.galleryUrl(prev.id)}"><span>‹ 前のアルバム</span><strong>${esc(prev.title)}</strong></a>` : '<span></span>'}
      ${next ? `<a class="pager-next" href="${B.galleryUrl(next.id)}"><span>次のアルバム ›</span><strong>${esc(next.title)}</strong></a>` : '<span></span>'}</nav>
    <p class="back-link"><a class="text-link" href="album.html">ギャラリー一覧へ戻る ${B.ARROW}</a></p>`;

  const lb = B.lightbox(document.getElementById('lightbox'));
  main.addEventListener('click', e => { const b = e.target.closest('.photo-btn'); if (b) lb.open(g.photos, +b.dataset.i, b); });

  B.setSEO({ title: `${g.title}（写真${g.photos.length}枚） | Gallery`,
    description: g.description || `${g.title}の写真${g.photos.length}枚。${Site.SITE.name}のギャラリー。`,
    image: g.cover, canonicalPath: await B.canonicalFor('gallery', g.id),
    ld: [bc.ld, { '@context': 'https://schema.org', '@type': 'ImageGallery', name: g.title, datePublished: g.date, description: g.description || '' }] });
});
