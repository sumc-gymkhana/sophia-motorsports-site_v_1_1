Site.ready(() => Site.render(document.getElementById('car-list'), 'data/cars.json', list =>
  list.map(c => `<article class="card car-card">${Site.img(c.image, c.name)}
    <div class="card-body"><h3>${Site.esc(c.name)}</h3>
    <dl class="spec"><dt>愛称</dt><dd>${Site.esc(c.nickname)}</dd><dt>年式</dt><dd>${Site.esc(c.year)}</dd><dt>カテゴリ</dt><dd>${Site.esc(c.category)}</dd></dl>
    <p>${Site.esc(c.description)}</p></div></article>`).join('')));
