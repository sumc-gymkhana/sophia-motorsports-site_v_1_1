/* activities.html: 全活動を新しい順 / schedules.html: 今日以降の活動を日付順（同じactivities.jsonを利用） */
Site.ready(() => {
  const row = a => `<article class="row">${Site.img(a.image, a.title)}<div class="card-body"><div class="meta">
    <time datetime="${Site.esc(a.date)}">${Site.fmtDate(a.date)}</time><span class="tag">${Site.esc(a.category)}</span></div>
    <h3>${Site.esc(a.title)}</h3><p>${Site.esc(a.description)}</p></div></article>`;
  Site.render(document.getElementById('activity-list'), 'data/activities.json', d => [...d].sort(Site.byDateDesc).map(row).join(''));
  const t = new Date(), today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  Site.render(document.getElementById('schedule-list'), 'data/activities.json',
    d => d.filter(a => a.date >= today).sort((a, b) => a.date.localeCompare(b.date)).map(row).join(''), '現在、予定は準備中です。');
});
