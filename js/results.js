Site.ready(() => Site.render(document.getElementById('result-list'), 'data/results.json', list => {
  const g = {}; list.forEach(r => (g[r.year] = g[r.year] || []).push(r));
  return Object.keys(g).sort().reverse().map(y => `<section class="year-block" aria-labelledby="y${y}"><h2 id="y${y}">${Site.esc(y)}年度</h2>
    <ul class="result-list">${g[y].map(r => `<li><span>${Site.esc(r.event)}</span><strong>${Site.esc(r.result)}</strong></li>`).join('')}</ul></section>`).join('');
}));
