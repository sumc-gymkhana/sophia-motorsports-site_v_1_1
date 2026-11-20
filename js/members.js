Site.ready(() => Site.render(document.getElementById('member-list'), 'data/members.json', list =>
  list.map(m => `<article class="card member-card">${Site.img(m.image, m.name + 'の顔写真')}
    <div class="card-body">
      <h3>名前: ${Site.esc(m.name)}</h3>
      <div class="meta">
        <span class="tag">学年: ${Site.esc(m.grade)}</span>
        <span class="member-role">役職: ${Site.esc(m.role)}</span>
      </div>
      <ul class="member-fields">
        ${m.car ? `<li><strong>乗っている車:</strong> ${Site.esc(m.car)}</li>` : ''}
        ${m.wantCar ? `<li><strong>欲しい車:</strong> ${Site.esc(m.wantCar)}</li>` : ''}
        ${m.comment ? `<li><strong>一言:</strong> ${Site.esc(m.comment)}</li>` : ''}
      </ul>
    </div></article>`).join('')));