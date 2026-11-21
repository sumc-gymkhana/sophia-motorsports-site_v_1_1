/**
 * news-detail.js — 個別記事ページ（news-detail.html?id=xxx ／ 静的ページ news/xxx.html）
 * パンくず・親子記事ナビ・前後の記事・関連記事・写真ライトボックス・SEO設定
 */
Site.ready(async () => {
  'use strict';
  const { esc } = Site;
  const B = window.Blog;
  const RELATED_LIMIT = 3;
  const hero = document.getElementById('post-hero'), main = document.getElementById('post-main'), side = document.getElementById('blog-sidebar');

  let data, galleries = null;
  try { data = await B.getPosts(); }
  catch (err) { console.error(err); main.innerHTML = B.loadError('news.json'); return; }
  try { galleries = (await B.getGalleries()).byId; } catch { /* ギャラリーが読めなくても記事は表示する */ }

  const { list, byId } = data;
  const id = B.currentId();
  const post = byId.get(id);
  side.innerHTML = B.sidebarHTML(list, { currentId: id });

  if (!post) {
    hero.innerHTML = `${B.breadcrumb([['News', 'news.html'], ['記事が見つかりません', null]]).html}<p class="eyebrow eyebrow-light">News</p><h1>記事が見つかりません</h1>`;
    main.innerHTML = B.notice(`記事「${esc(id)}」は見つかりませんでした。削除されたか、URLが変わった可能性があります。<a class="text-link" href="news.html">記事一覧へ ${B.ARROW}</a>`);
    B.setSEO({ title: '記事が見つかりません | News', description: '指定された記事は見つかりませんでした。', noindex: true });
    return;
  }

  /* ---- ヒーロー（パンくず・カテゴリー・日付・タイトル・タグ） ---- */
  const crumbs = [['News', 'news.html'], [post.category, B.catUrl(post.category)],
    ...post.ancestors.map(a => [a.title, B.postUrl(a.id)]), [post.title, null]];
  const bc = B.breadcrumb(crumbs);
  hero.innerHTML = `${bc.html}<div class="meta post-meta">${B.dateTag(post.date)}${B.catLink(post.category)}${post.important ? '<span class="badge-important">重要</span>' : ''}</div>
    ${post.parent ? `<p class="post-hero-parent"><a href="${B.postUrl(post.parent.id)}">${esc(post.parent.title)}</a></p>` : ''}
    <h1>${esc(post.title)}</h1>${B.tagLinks(post.tags, 'post-tags post-tags-light')}`;

  /* ---- 親子記事ナビ ---- */
  const siblings = post.parent ? post.parent.children : [];
  const seriesBox = post.parent ? `<nav class="series-box" aria-label="「${esc(post.parent.title)}」の記事一覧">
      <p class="series-label">この記事は次の記事の一部です</p>
      <a class="series-parent" href="${B.postUrl(post.parent.id)}">${esc(post.parent.title)}</a>
      <ol class="series-list">${siblings.map(s => s.id === post.id
        ? `<li class="is-current"><span aria-current="page">${esc(s.title)}</span></li>`
        : `<li><a href="${B.postUrl(s.id)}">${esc(s.title)}</a>${s.date ? `<small>${B.dateTag(s.date)}</small>` : ''}</li>`).join('')}</ol></nav>` : '';
  const childBox = post.children.length ? `<section class="child-posts" aria-labelledby="child-title">
      <h2 id="child-title" class="post-section-title">子記事一覧<span>${post.children.length}件</span></h2>
      <ol class="child-list">${post.children.map(c => `<li><a href="${B.postUrl(c.id)}">
        <span class="child-thumb">${Site.img(c.thumbnail, '', '')}</span>
        <span class="child-body">${B.dateTag(c.date)}<strong>${esc(c.title)}</strong><span>${esc(c.excerptText)}</span>${c.children.length ? `<em>さらに ${c.children.length}件の記事</em>` : ''}</span>
        <span class="child-arrow">${B.ARROW}</span></a></li>`).join('')}</ol></section>` : '';

  /* ---- 前の記事 / 次の記事（子記事は同じ親の中で、それ以外は親を持たない記事どうしを日付順で） ---- */
  let prev, next;
  if (post.parent) { const i = siblings.indexOf(post); prev = siblings[i - 1]; next = siblings[i + 1]; }
  else { const top = list.filter(p => !p.parent), i = top.indexOf(post); prev = top[i + 1]; next = top[i - 1]; } // 新しい順
  const pager = (prev || next) ? `<nav class="post-pager" aria-label="前後の記事">
      ${prev ? `<a class="pager-prev" href="${B.postUrl(prev.id)}"><span>‹ 前の記事</span><strong>${esc(prev.title)}</strong></a>` : '<span></span>'}
      ${next ? `<a class="pager-next" href="${B.postUrl(next.id)}"><span>次の記事 ›</span><strong>${esc(next.title)}</strong></a>` : '<span></span>'}</nav>` : '';

  /* ---- 関連記事（共通タグ×3点＋同じカテゴリー×1点。親子・同じシリーズは除く） ---- */
  const exclude = new Set([post, ...post.ancestors, ...post.children, ...siblings]);
  const related = list.filter(p => !exclude.has(p))
    .map(p => ({ p, s: p.tags.filter(t => post.tags.includes(t)).length * 3 + (p.category === post.category ? 1 : 0) }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s || B.newestFirst(a.p, b.p)).slice(0, RELATED_LIMIT).map(x => x.p);
  const relatedBox = related.length ? `<section class="related-posts" aria-labelledby="related-title">
      <h2 id="related-title" class="post-section-title">関連記事</h2><div class="grid post-grid">${related.map(p => B.postCard(p)).join('')}</div></section>` : '';

  /* ---- 写真 ---- */
  const photos = post.images; // [{src, caption}]
  const gallery = post.galleryId && galleries && galleries.get(post.galleryId);
  const lead = post.thumbnail && !photos.some(p => p.src === post.thumbnail)
    ? `<figure class="post-lead">${Site.img(post.thumbnail, post.title, '')}</figure>` : '';

  main.innerHTML = `<article class="post-article">
    ${seriesBox}${lead}
    <div class="post-content">${B.renderContent(post.content) || '<p class="post-empty">（本文は準備中です）</p>'}</div>
    ${photos.length ? `<section class="post-photos" aria-labelledby="photos-title"><h2 id="photos-title" class="post-section-title">写真<span>${photos.length}枚</span></h2>${B.photoGrid(photos, post.title)}</section>` : ''}
    ${gallery ? `<a class="gallery-link" href="${B.galleryUrl(gallery.id)}">${Site.img(gallery.cover, '', '')}<span><small>Gallery</small><strong>${esc(gallery.title)}</strong>${gallery.photos.length}枚の写真をすべて見る ${B.ARROW}</span></a>` : ''}
    ${post.tags.length ? `<div class="post-footer-tags"><span>タグ</span>${B.tagLinks(post.tags)}</div>` : ''}
    </article>${childBox}${pager}${relatedBox}`;

  const lb = B.lightbox(document.getElementById('lightbox'));
  main.addEventListener('click', e => { const b = e.target.closest('.photo-btn'); if (b) lb.open(photos, +b.dataset.i, b); });

  /* ---- SEO ---- */
  const canonicalPath = await B.canonicalFor('news', post.id);
  B.setSEO({ title: post.title + (post.parent ? ` | ${post.parent.title}` : '') + ' | News', description: post.description,
    image: post.thumbnail, canonicalPath, ld: [bc.ld, { '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: post.title, datePublished: post.date, ...(post.updated ? { dateModified: post.updated } : {}),
      description: post.description, keywords: post.tags.join(','), articleSection: post.category,
      ...(post.thumbnail ? { image: new URL(post.thumbnail, document.baseURI).href } : {}),
      author: { '@type': 'Organization', name: Site.SITE.name }, publisher: { '@type': 'Organization', name: Site.SITE.name } }] });
});
