/**
 * news.js — news.html（ブログ記事一覧・検索・タグ / カテゴリー絞り込み）
 * URLの例: news.html?q=ジムカーナ / news.html?tag=新歓 / news.html?category=大会結果
 * データは data/news.json（記事の追加はJSONだけでOK）
 */
Site.ready(async () => {
  'use strict';
  const { esc } = Site;
  const B = window.Blog;
  const PAGE_SIZE = 12; // 「もっと見る」1回で増える件数
  const $ = id => document.getElementById(id);
  const grid = $('news-grid'), count = $('news-count'), input = $('news-search'), form = $('news-search-form');
  const catBox = $('news-cats'), active = $('news-active'), more = $('news-more'), side = $('blog-sidebar');

  let posts;
  try { posts = (await B.getPosts()).list; }
  catch (err) { console.error(err); grid.innerHTML = B.loadError('news.json'); return; }

  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', tag: params.get('tag') || '', category: params.get('category') || '' };
  let shown = PAGE_SIZE;
  input.value = state.q;

  const cats = [...new Set(posts.map(p => p.category))];
  const highlight = (text, terms) => {
    let h = esc(text);
    terms.forEach(t => { if (t) h = h.replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); });
    return h;
  };

  function draw(push) {
    const terms = B.norm(state.q).split(/\s+/).filter(Boolean);
    const list = posts.filter(p => (!state.category || p.category === state.category) &&
      (!state.tag || p.tags.includes(state.tag)) && terms.every(t => p.search.includes(t)));

    // 見出し・パンくず・SEO を絞り込み条件に合わせる
    const labels = [state.category && `カテゴリー「${state.category}」`, state.tag && `タグ「#${state.tag}」`, state.q && `「${state.q}」の検索結果`].filter(Boolean);
    const title = labels.length ? labels.join(' ／ ') : 'お知らせ・ブログ';
    $('news-heading').textContent = title;
    $('news-lead').textContent = labels.length ? `${list.length}件の記事が見つかりました。` : 'ジムカーナの大会結果から、初心者向けの部活紹介、キャンパスライフまで。';
    const bc = B.breadcrumb(labels.length ? [['News', 'news.html'], [title, null]] : [['News', null]]);
    $('news-breadcrumb').innerHTML = bc.html;
    B.setSEO({ title: labels.length ? `${title} | News` : 'News', description: document.querySelector('meta[name="description"]').content,
      canonicalPath: 'news.html', ld: [bc.ld], noindex: !!state.q });

    catBox.innerHTML = [['', 'すべて'], ...cats.map(c => [c, c])].map(([v, l]) =>
      `<button type="button" data-v="${esc(v)}" aria-pressed="${v === state.category}">${esc(l)}</button>`).join('');
    const chips = [state.tag && ['tag', `#${state.tag}`], state.q && ['q', `検索: ${state.q}`]].filter(Boolean);
    active.hidden = !chips.length;
    active.innerHTML = chips.map(([k, l]) => `<button type="button" class="filter-chip" data-clear="${k}" aria-label="${esc(l)} の条件を外す">${esc(l)}<span aria-hidden="true">×</span></button>`).join('') +
      (chips.length ? '<button type="button" class="filter-clear" data-clear="all">条件をすべて解除</button>' : '');

    count.textContent = `${list.length} 件の記事`;
    grid.innerHTML = list.slice(0, shown).map(p => B.postCard(p, s => highlight(s, terms))).join('') ||
      B.notice('該当する記事はありません。別のキーワードやタグでお試しください。');
    more.hidden = list.length <= shown;
    side.innerHTML = B.sidebarHTML(posts, state);

    const qs = new URLSearchParams(Object.entries(state).filter(([, v]) => v)).toString();
    history[push ? 'pushState' : 'replaceState'](state, '', qs ? `news.html?${qs}` : 'news.html');
  }

  const update = (patch, push = true) => { Object.assign(state, patch); shown = PAGE_SIZE; draw(push); };
  form.addEventListener('submit', e => { e.preventDefault(); update({ q: input.value.trim() }); });
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => update({ q: input.value.trim() }, false), 250); });
  catBox.addEventListener('click', e => { const b = e.target.closest('button'); if (b) update({ category: b.dataset.v }); });
  active.addEventListener('click', e => {
    const k = e.target.closest('[data-clear]')?.dataset.clear; if (!k) return;
    if (k === 'all') update({ q: '', tag: '', category: '' }); else update({ [k]: '' });
    if (k === 'q' || k === 'all') input.value = '';
  });
  more.addEventListener('click', () => { shown += PAGE_SIZE; draw(false); });
  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(location.search);
    Object.assign(state, { q: p.get('q') || '', tag: p.get('tag') || '', category: p.get('category') || '' });
    input.value = state.q; shown = PAGE_SIZE; draw(false);
  });
  draw(false);
});
