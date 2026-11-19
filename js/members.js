Site.ready(() => Site.render(document.getElementById('member-list'), 'data/members.json', list =>
  list.map(m => `<article class="card member-card">${Site.img(m.image, m.name + 'の顔写真')}
    <div class="card-body"><span class="member-role">${Site.esc(m.role)}</span><h3>${Site.esc(m.name)}</h3>
    <div class="meta"><span class="tag">${Site.esc(m.grade)}</span>${m.car ? `<span class="tag">担当車両: ${Site.esc(m.car)}</span>` : ''}</div>
    <p>${Site.esc(m.comment)}</p></div></article>`).join('')));
