
/* Simple static client-side app
   Expects content/articles/index.json and content/articles/<n>.json files,
   and content/daily-office/<service>.json files.
*/

const tocList = document.getElementById('tocList');
const contentArea = document.getElementById('contentArea');
const searchInput = document.getElementById('searchInput');
const toggleScripture = document.getElementById('toggleScripture');
const toggleNotes = document.getElementById('toggleNotes');
const toggleCommentary = document.getElementById('toggleCommentary');
const homeBtn = document.getElementById('homeBtn');
const printBtn = document.getElementById('printBtn');

let articlesIndex = [];

// utility to fetch JSON and return parsed or null
async function fetchJson(path){
  try{
    const r = await fetch(path, {cache: "no-cache"});
    if(!r.ok) return null;
    return await r.json();
  } catch(e){
    console.error("Fetch error", path, e);
    return null;
  }
}

// load index on startup
async function loadIndex(){
  articlesIndex = await fetchJson('content/articles/index.json') || [];
  buildTOC();
}

// build table of contents (list of articles)
function buildTOC(){
  tocList.innerHTML = '';
  articlesIndex.forEach(a => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#/article/' + a.number;
    link.textContent = a.number + '. ' + a.title;
    li.appendChild(link);
    tocList.appendChild(li);
  });
}

// render list view (all articles briefly)
function renderAll(){
  document.title = "Thirty-Nine Articles — Index";
  contentArea.innerHTML = '';
  articlesIndex.forEach(a => {
    const sec = document.createElement('section');
    sec.className = 'article card';
    sec.innerHTML = `<h3><a href="#/article/${a.number}">${a.number}. ${escapeHtml(a.title)}</a></h3>
      <div class="ref">Article ${a.number}</div>`;
    contentArea.appendChild(sec);
  });
}

// render a single article by number (fetch the JSON file)
async function renderArticle(num){
  const path = `content/articles/${num}.json`;
  const art = await fetchJson(path);
  if(!art){
    contentArea.innerHTML = `<div class="card"><h3>Not found</h3><p>Article ${num} not found.</p></div>`;
    return;
  }
  document.title = `Article ${num} — ${art.title}`;
  contentArea.innerHTML = '';
  const s = document.createElement('section');
  s.className = 'article card';
  s.innerHTML = `<h2>${art.number}. ${escapeHtml(art.title)}</h2>
    <div class="ref">Article ${art.number}</div>
    <div class="text">${escapeHtml(art.text)}</div>`;

  // scripture
  if(toggleScripture.checked && art.scripture && art.scripture.length){
    const d = document.createElement('div');
    d.className = 'scripture';
    d.innerHTML = `<strong>Scripture:</strong> ${escapeHtml(art.scripture.join('; '))}`;
    s.appendChild(d);
  }

  // commentary with inline footnote markers [1] transformed
  if(toggleCommentary.checked && art.commentary){
    const div = document.createElement('div');
    div.className = 'commentary';
    // replace [1] markers with anchors
    let commentaryHtml = escapeHtml(art.commentary);
    commentaryHtml = commentaryHtml.replace(/\[([0-9]+)\]/g, (m, p1) => {
      const idref = `ref-${art.number}-${p1}`;
      return `<a id="${idref}" href="#fn-${art.number}-${p1}" class="superspan">[${p1}]</a>`;
    });
    div.innerHTML = `<strong>Commentary:</strong> <p>${commentaryHtml}</p>`;
    s.appendChild(div);
  }

  // notes (historical)
  if(toggleNotes.checked && art.notes){
    const div = document.createElement('div');
    div.className = 'notes';
    div.innerHTML = `<strong>Historical note:</strong> ${escapeHtml(art.notes)}`;
    s.appendChild(div);
  }

  // footnotes list
  if(art.footnotes && art.footnotes.length){
    const fnDiv = document.createElement('div');
    fnDiv.innerHTML = `<h4>Footnotes</h4>`;
    const ol = document.createElement('ol');
    art.footnotes.forEach((fn, idx) => {
      const li = document.createElement('li');
      li.id = `fn-${art.number}-${fn.number}`;
      if(fn.url){
        li.innerHTML = `<a href="${fn.url}" target="_blank" rel="noopener">${escapeHtml(fn.text)}</a> <a href="#ref-${art.number}-${fn.number}">↩︎</a>`;
      } else {
        li.textContent = fn.text;
      }
      ol.appendChild(li);
    });
    fnDiv.appendChild(ol);
    s.appendChild(fnDiv);
  }

  // scholarship links
  if(art.scholarship && art.scholarship.length){
    const sup = document.createElement('div');
    sup.innerHTML = `<h4>Further reading</h4>`;
    const ul = document.createElement('ul');
    art.scholarship.forEach(link => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${link.url}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`;
      ul.appendChild(li);
    });
    sup.appendChild(ul);
    s.appendChild(sup);
  }

  // back to index
  const back = document.createElement('p');
  back.className = 'muted';
  back.innerHTML = `<a href="#/">← Back to contents</a>`;
  s.appendChild(back);

  contentArea.appendChild(s);
}

// render daily office service
async function renderDaily(service){
  const path = `content/daily-office/${service}.json`;
  const sjson = await fetchJson(path);
  if(!sjson){
    contentArea.innerHTML = `<div class="card"><h3>Not found</h3><p>Service ${service} not found.</p></div>`;
    return;
  }
  document.title = `${sjson.title} — Daily Office`;
  contentArea.innerHTML = '';
  const s = document.createElement('section');
  s.className = 'card article';
  let inner = `<h2>${escapeHtml(sjson.title)}</h2>`;
  if(sjson.opening && sjson.opening.sentences){
    inner += sjson.opening.sentences.map(p => `<p><em>${escapeHtml(p)}</em></p>`).join('');
  }
  if(sjson.invitatory){
    inner += `<h3>Invitatory</h3><p><strong>${escapeHtml(sjson.invitatory.call)}</strong> — ${escapeHtml(sjson.invitatory.response)}</p>`;
    if(sjson.invitatory.canticles) inner += `<p><strong>Canticles:</strong> ${escapeHtml(sjson.invitatory.canticles.join(', '))}</p>`;
  }
  if(sjson.psalms) inner += `<h3>Psalms</h3><p>${escapeHtml(sjson.psalms.description || '')}</p>`;
  if(sjson.readings){
    inner += '<h3>Readings</h3>' + sjson.readings.map(r => `<p><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.type||'')} (lectionary key: ${escapeHtml(r.lectionaryKey||'—')})</p>`).join('');
  }
  if(sjson.canticle) inner += `<h3>Canticle</h3><p>${escapeHtml(sjson.canticle.default || '')}</p>`;
  if(sjson.creed) inner += `<h3>Creed</h3><p>${escapeHtml(sjson.creed)}</p>`;
  if(sjson.prayers){
    inner += '<h3>Prayers</h3>';
    if(sjson.prayers.lordPrayer) inner += `<p>The Lord's Prayer</p>`;
    if(sjson.prayers.collects) inner += `<ul>${sjson.prayers.collects.map(c=>`<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
  }
  s.innerHTML = inner;
  contentArea.appendChild(s);
}

// simple escape
function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','<br>'); }

// parse hash routes
function parseHash(){
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  if(parts.length === 0) return { route: 'index' };
  if(parts[0] === 'article') return { route: 'article', num: parseInt(parts[1],10) };
  if(parts[0] === 'daily') return { route: 'daily', service: parts[1] };
  return { route: 'index' };
}

// router
async function router(){
  const p = parseHash();
  if(p.route === 'index'){
    renderAll();
  } else if(p.route === 'article'){
    await renderArticle(p.num);
  } else if(p.route === 'daily'){
    await renderDaily(p.service);
  } else {
    contentArea.innerHTML = '<div class="card"><h3>Not found</h3></div>';
  }
}

// search: fetch all articles (lazy) and filter by query across title, text, commentary, notes, footnotes
async function doSearch(q){
  q = (q||'').trim().toLowerCase();
  if(!q){
    router();
    return;
  }
  // fetch all articles (1..39) concurrently
  const fetches = [];
  for(let i=1;i<=39;i++){
    fetches.push(fetchJson(`content/articles/${i}.json`));
  }
  const results = (await Promise.all(fetches)).filter(Boolean);
  const filtered = results.filter(a => {
    const hay = `${a.title} ${a.text || ''} ${a.commentary || ''} ${a.notes || ''} ${ (a.footnotes||[]).map(f=>f.text).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
  // render filtered list
  contentArea.innerHTML = '';
  if(filtered.length === 0){
    contentArea.innerHTML = '<div class="card"><p>No results</p></div>';
    return;
  }
  filtered.forEach(a => {
    const sec = document.createElement('section'); sec.className='article card';
    sec.innerHTML = `<h3><a href="#/article/${a.number}">${a.number}. ${escapeHtml(a.title)}</a></h3><div class="ref">Article ${a.number}</div><p>${escapeHtml((a.commentary||'').slice(0,300))}...</p>`;
    contentArea.appendChild(sec);
  });
}

// event handlers
window.addEventListener('hashchange', router);
homeBtn.addEventListener('click', ()=> { location.hash = '/'; });
printBtn.addEventListener('click', ()=> window.print());
document.getElementById('searchInput').addEventListener('input', e => doSearch(e.target.value));
toggleScripture.addEventListener('change', ()=> router());
toggleNotes.addEventListener('change', ()=> router());
toggleCommentary.addEventListener('change', ()=> router());

// initialize
loadIndex().then(() => {
  // default hash if empty
  if(!location.hash) location.hash = '/';
  router();
});
