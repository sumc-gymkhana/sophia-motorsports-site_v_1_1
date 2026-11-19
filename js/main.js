/**
 * main.js — 全ページ共通
 *  1. 共通ヘッダー / フッター / ナビゲーション（メニュー変更は NAV だけ編集）
 *  2. 公式SNS（URL変更は SITE.sns だけ編集）
 *  3. ユーティリティ（JSON読込・描画・日付）
 *  4. トップページ自動更新（News / 最新活動 / 最新アルバム / 注目記事 / 公式SNS）
 *  5. お問い合わせフォーム（mailto方式）・更新ガイドのコピーボタン
 * ※ 部員が日常の更新でこのファイルを触る必要はありません。
 */
(() => {
  'use strict';

  /* ---------- 設定 ---------- */
  const ICONS = {
    // X（旧Twitter）。塗りつぶしアイコン
    x: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    // Instagram。線アイコン
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>'
  };
  const SITE = {
    name: '上智大学自動車部',
    en: 'Sophia Motorsports',
    address: 'Yotsuya, Tokyo',
    email: 'info@example.com', // お問い合わせの送信先（要変更）
    message: '機械と向き合い、仲間と挑み、自分を越える。',
    logo: 'images/logos/上智ロゴ.jpg', // ロゴ画像。例 'images/logos/logo.svg'。空のままなら「S」マークを表示します
    gaId: '', // Google Analytics 4 の測定ID（例 'G-XXXXXXXXXX'）。空のままなら計測しません
    sns: [
      { id: 'x', label: 'X', handle: '@sumc_sophia', url: 'https://x.com/sumc_sophia?lang=ja' },
      { id: 'instagram', label: 'Instagram', handle: '@sumc.gymkhana', url: 'https://www.instagram.com/sumc.gymkhana/' }
    ]
  };
  const NAV = [
    ['index.html', 'Home'], ['about.html', 'About Us'], ['members.html', 'Members'], ['cars.html', 'Cars'],
    ['activities.html', 'Activities'], ['album.html', 'Album'], ['results.html', 'Results'],
    ['schedules.html', 'Schedules'], ['join.html', 'Join Us'], ['contact.html', 'Contact']
  ];
  const PLACEHOLDER = 'images/placeholder.svg';
  const NEWS_LIMIT = 5, ACTIVITY_LIMIT = 3, ALBUM_LIMIT = 6;

  /* ---------- ユーティリティ ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = d => String(d || '').replace(/-/g, '.');
  const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));
  const img = (src, alt, cls = 'card-img') =>
    `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" width="800" height="600">`;
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();

  // 画像ファイルが見つからないときは代替画像を表示（data-fallback があればそれを優先）
  document.addEventListener('error', e => {
    const t = e.target;
    if (t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = '1'; t.src = t.dataset.fallback || PLACEHOLDER; }
  }, true);

  async function loadJSON(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path} (${res.status})`);
    return res.json();
  }
  // JSONを読み込み fn(data) のHTMLを el に描画。失敗・空のときは案内文を表示。
  async function render(el, path, fn, emptyMsg = '現在、掲載できる情報はありません。') {
    if (!el) return;
    try {
      el.innerHTML = fn(await loadJSON(path)) || `<p class="notice">${emptyMsg}</p>`;
    } catch (err) {
      console.error(err);
      el.innerHTML = '<p class="notice">データを読み込めませんでした。JSONの書き方（カンマ・引用符）を確認してください。手元で確認する場合は簡易サーバー経由で開く必要があります。</p>';
    }
  }

  /* ---------- カード・リストのHTML ---------- */
  const galleryCard = g => `<article class="card">${img(g.image, g.title)}
    <div class="card-body"><div class="meta"><time datetime="${esc(g.date)}">${fmtDate(g.date)}</time><span class="tag">${esc(g.category)}</span></div>
    <h3>${esc(g.title)}</h3><p>${esc(g.description)}</p></div></article>`;
  const activityCard = a => `<article class="card">${img(a.image, a.title)}
    <div class="card-body"><div class="meta"><time datetime="${esc(a.date)}">${fmtDate(a.date)}</time><span class="tag">${esc(a.category)}</span></div>
    <h3>${esc(a.title)}</h3><p>${esc(a.description)}</p></div></article>`;
  // お知らせ: important:true を上部に固定し、残りを新しい順に並べて合計 NEWS_LIMIT 件
  const newsHTML = list => {
    const sorted = [...list].sort(byDateDesc);
    const items = [...sorted.filter(n => n.important), ...sorted.filter(n => !n.important)].slice(0, NEWS_LIMIT);
    if (!items.length) return '';
    return `<ul class="news-list">${items.map(n => {
      const title = n.url ? `<a class="news-title" href="${esc(n.url)}">${esc(n.title)}</a>` : `<span class="news-title">${esc(n.title)}</span>`;
      return `<li class="news-item${n.important ? ' is-important' : ''}"><time datetime="${esc(n.date)}">${fmtDate(n.date)}</time>${n.important ? '<span class="badge-important">重要</span>' : ''}${title}</li>`;
    }).join('')}</ul>`;
  };
  const snsLink = (s, cls, inner) =>
    `<a class="${cls}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label)}">${inner}</a>`;

  window.Site = { SITE, esc, fmtDate, byDateDesc, img, ready, loadJSON, render, galleryCard, activityCard };

  // Google Analytics（SITE.gaId があるときだけ読み込む。HTMLの編集は不要）
  if (SITE.gaId) {
    const ga = document.createElement('script');
    ga.async = true; ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(SITE.gaId);
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', SITE.gaId);
  }

  /* ---------- ページ描画 ---------- */
  ready(() => {
    const here = location.pathname.split('/').pop() || 'index.html';
    // https:// で始まるリンクは外部リンクとして新しいタブで開く
    const navLinks = NAV.map(([h, l]) => /^https?:\/\//.test(h)
      ? `<a href="${h}" target="_blank" rel="noopener noreferrer">${l}</a>`
      : `<a href="${h}"${h === here ? ' aria-current="page"' : ''}>${l}</a>`).join('');
    const brand = `<a class="brand" href="index.html" aria-label="${SITE.name} ホーム"><span class="brand-mark" aria-hidden="true">${SITE.logo ? `<img class="brand-logo" src="${esc(SITE.logo)}" alt="">` : 'S'}</span>
      <span class="brand-copy"><strong>${SITE.en}</strong><span>${SITE.name}</span></span></a>`;

    // ヘッダー（SNSアイコン付き）
    const header = document.getElementById('site-header');
    if (header) {
      header.className = 'site-header';
      header.innerHTML = `<div class="header-inner">${brand}<div class="header-right">
        <nav class="navigation" id="main-navigation" aria-label="メインナビゲーション">${navLinks}</nav>
        <div class="header-sns">${SITE.sns.map(s => snsLink(s, 'sns-icon', ICONS[s.id])).join('')}</div>
        <button class="menu-button" type="button" aria-label="メニューを開く" aria-controls="main-navigation" aria-expanded="false">
          <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>
          <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></div>`;
      const btn = header.querySelector('.menu-button'), nav = header.querySelector('.navigation');
      const setMenu = open => {
        btn.setAttribute('aria-expanded', open);
        btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
        nav.classList.toggle('is-open', open);
        document.body.classList.toggle('menu-open', open);
      };
      btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); btn.focus(); } });
      window.addEventListener('resize', () => { if (window.innerWidth > 1180) setMenu(false); });
    }

    // フッター（SNSリンク付き）
    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML = `<div class="container"><div class="footer-main"><div>${brand}
        <p class="footer-message">${SITE.message}</p>
        <div class="footer-sns">${SITE.sns.map(s => snsLink(s, 'sns-icon', ICONS[s.id])).join('')}</div></div>
        <nav class="footer-nav" aria-label="フッターナビゲーション">${navLinks}</nav></div>
        <div class="footer-bottom"><p>${SITE.address}</p>
        <p class="footer-links"><a href="how-to-update.html">更新ガイド（部員用）</a><span>© ${new Date().getFullYear()} ${SITE.name}</span></p></div></div>`;
    }

    // トップページ自動更新（要素がある場合のみ動作）
    render(document.getElementById('news-list'), 'data/news.json', newsHTML, 'お知らせはありません。');
    render(document.getElementById('latest-activities'), 'data/activities.json',
      d => [...d].sort(byDateDesc).slice(0, ACTIVITY_LIMIT).map(activityCard).join(''));
    const album = document.getElementById('latest-album'), feat = document.getElementById('featured');
    if (album || feat) loadJSON('data/gallery.json').then(d => {
      if (album) album.innerHTML = [...d].sort(byDateDesc).slice(0, ALBUM_LIMIT).map(galleryCard).join('') || '<p class="notice">写真は準備中です。</p>';
      if (feat) feat.innerHTML = d.filter(g => g.featured).sort(byDateDesc).map(galleryCard).join('') || '<p class="notice">注目記事は準備中です。</p>';
    }).catch(err => {
      console.error(err);
      [album, feat].forEach(e => e && (e.innerHTML = '<p class="notice">データを読み込めませんでした。gallery.json の書き方を確認してください。</p>'));
    });
    const snsBox = document.getElementById('sns-cards');
    if (snsBox) snsBox.innerHTML = SITE.sns.map(s => snsLink(s, 'sns-card',
      `<span class="sns-badge">${ICONS[s.id]}</span><span><strong>${esc(s.label)}</strong><span>${esc(s.handle)} をフォロー</span></span>`)).join('');

    // お問い合わせ（サーバー不要のmailto方式）
    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form));
      const body = `お名前: ${v.name}\nメール: ${v.email}\n学年: ${v.year}\n\n${v.message}`;
      location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('【Webサイトより】お問い合わせ')}&body=${encodeURIComponent(body)}`;
    });

    // 更新ガイド: コード例にコピーボタンを付ける
    document.querySelectorAll('.howto-body pre').forEach(pre => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'copy-btn'; b.textContent = 'コピー';
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(pre.querySelector('code').innerText); b.textContent = 'コピーしました'; }
        catch { b.textContent = '選択してコピーしてください'; }
        setTimeout(() => (b.textContent = 'コピー'), 2000);
      });
      pre.appendChild(b);
    });
  });
})();
