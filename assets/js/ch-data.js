/* ════════════════════════════════════════════════════════════════════════════
   Children Home website: content from the database (Supabase)
     • Home page:    Programs section (cards + pop-up), above Credentials
     • Moments page: moments added in admin.html, shown above the older ones
   The connection settings are in supabase-config.js. Until they are filled in,
   or if the database can't be reached, the pages simply look as before.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  const cfg = window.CH_SUPABASE || {};
  const base = String(cfg.url || '').trim().replace(/\/+$/, '');
  const key = String(cfg.key || '').trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base) || !key) return;   // not connected yet

  const headers = { apikey: key, Accept: 'application/json' };
  if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;              // older "anon" keys
  async function get(path) {
    const r = await fetch(base + '/rest/v1/' + path, { headers });
    if (!r.ok) throw new Error('Database answered ' + r.status);
    return r.json();
  }

  /* helpers */
  const isZh = () => document.documentElement.lang === 'zh';
  const T = (en, zh) => (isZh() ? zh : en);
  const pick = (row, f) => (isZh() && row[f + '_zh'] && row[f + '_zh'].trim() ? row[f + '_zh'] : row[f + '_en'] || '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (/^https:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()) ? String(u).trim() : '');
  const paras = t => String(t || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
  const donateUrl = row => safeUrl(row && row.donate_url) || (typeof CONFIG !== 'undefined' && CONFIG.donate) || 'https://m.amitabhafoundation.my/en/donation';
  const onLangChange = fn => new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ── Home: Programs ─────────────────────────────────────────────────────── */
  const pgSec = document.getElementById('programs');
  if (pgSec) loadPrograms();

  async function loadPrograms() {
    let rows;
    try {
      rows = await get('ch_programs?select=id,title_en,title_zh,summary_en,summary_zh,body_en,body_zh,image_url,corporate_form_url,donate_url'
        + '&published=eq.true&order=sort_order.asc,created_at.desc');
    } catch (e) { console.warn('Programs could not be loaded:', e.message); return; }
    if (!Array.isArray(rows) || !rows.length) return;

    const grid = pgSec.querySelector('.pg-grid');
    const rd = document.getElementById('pgReader');
    const card = rd.querySelector('.pg-rcard');
    let openIdx = null, lastFocus = null;

    function renderCards() {
      grid.innerHTML = rows.map((p, i) => {
        const img = safeUrl(p.image_url);
        return '<button type="button" class="pg-card" data-i="' + i + '">'
          + '<span class="pg-img">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<i class="fa fa-hands-holding-child" aria-hidden="true"></i>') + '</span>'
          + '<span class="pg-body"><span class="pg-tag">' + T('Program', '项目') + '</span>'
          + '<b class="pg-title">' + esc(pick(p, 'title')) + '</b>'
          + (pick(p, 'summary') ? '<span class="pg-sum">' + esc(pick(p, 'summary')) + '</span>' : '')
          + '<span class="pg-more">' + T('Learn more', '了解更多') + ' <i class="fa fa-arrow-right" aria-hidden="true"></i></span></span></button>';
      }).join('');
    }

    function fill(i) {
      const p = rows[i], img = safeUrl(p.image_url), form = safeUrl(p.corporate_form_url);
      const art = document.getElementById('pgRArt');
      art.innerHTML = img ? '<img src="' + esc(img) + '" alt="">' : '';
      art.hidden = !img;
      document.getElementById('pgRTitle').textContent = pick(p, 'title');
      document.getElementById('pgRText').innerHTML = paras(pick(p, 'body')) || paras(pick(p, 'summary'));
      document.getElementById('pgDonate').href = donateUrl(p);
      const corp = document.getElementById('pgCorp');
      corp.hidden = !form; if (form) corp.querySelector('a').href = form;
    }

    function open(i, from) {
      openIdx = i; lastFocus = from || document.activeElement; fill(i);
      rd.hidden = false; document.documentElement.style.overflow = 'hidden';
      rd.querySelector('.pg-rscroll').scrollTop = 0;
      requestAnimationFrame(() => { rd.classList.add('on'); document.getElementById('pgClose').focus(); });
    }
    function close() {
      if (openIdx === null) return;
      openIdx = null; rd.classList.remove('on'); document.documentElement.style.overflow = '';
      setTimeout(() => { if (openIdx === null) rd.hidden = true; }, 300);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    grid.addEventListener('click', e => { const c = e.target.closest('.pg-card'); if (c) open(+c.dataset.i, c); });
    document.getElementById('pgClose').addEventListener('click', close);
    rd.addEventListener('click', e => { if (!card.contains(e.target)) close(); });
    document.addEventListener('keydown', e => {
      if (openIdx === null) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {   // keep the keyboard inside the pop-up
        const f = [...card.querySelectorAll('a[href],button')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });

    renderCards(); pgSec.hidden = false;
    onLangChange(() => { renderCards(); if (openIdx !== null) fill(openIdx); });
  }

  /* ── Moments page: moments from the database ──────────────────────────── */
  const newsGrid = document.querySelector('#news .news-grid');
  if (newsGrid) loadMoments();

  async function loadMoments() {
    let rows;
    try {
      rows = await get('ch_moments?select=id,tag,moment_date,title_en,title_zh,summary_en,summary_zh,body_en,body_zh,image_url,photos,show_donate'
        + '&published=eq.true&order=moment_date.desc,created_at.desc');
    } catch (e) { console.warn('Moments could not be loaded:', e.message); return; }
    if (!Array.isArray(rows) || !rows.length) return;

    const TAGS = { activities: ['Activities', '活动'], community: ['Community', '社区'], appeal: ['Appeal', '募集'] };
    let cards = [];

    function cardHtml(m) {
      const img = safeUrl(m.image_url), tag = TAGS[m.tag] || TAGS.activities;
      const photos = (Array.isArray(m.photos) ? m.photos : []).filter(ph => ph && safeUrl(ph.src));
      const body = paras(pick(m, 'body'));
      const strip = photos.length ? '<div class="news-strip">' + photos.map((ph, n) =>
        '<button type="button" data-photo="' + esc(safeUrl(ph.src)) + '"><img src="' + esc(safeUrl(ph.thumb) || safeUrl(ph.src)) + '" alt="'
        + esc(T('Photo ' + (n + 1) + ': ', '照片 ' + (n + 1) + '：') + pick(m, 'title')) + '" loading="lazy"></button>').join('') + '</div>' : '';
      const donate = m.show_donate ? '<a href="' + esc(donateUrl(m)) + '" class="btn btn-donate news-cta" target="_blank" rel="noopener"><i class="fa fa-heart" aria-hidden="true"></i> ' + T('Donate now', '立即捐款') + '</a>' : '';
      const more = body + strip + donate;
      return (img ? '<div class="news-img"><img src="' + esc(img) + '" alt="' + esc(pick(m, 'title')) + '" loading="lazy"></div>' : '')
        + '<div class="news-body">'
        + '<div class="news-meta"><span class="tag' + (m.tag === 'appeal' ? ' appeal' : '') + '">' + T(tag[0], tag[1]) + '</span><span class="date">' + esc(String(m.moment_date || '').slice(0, 4)) + '</span></div>'
        + '<h3>' + esc(pick(m, 'title')) + '</h3>'
        + (pick(m, 'summary') ? '<p>' + esc(pick(m, 'summary')) + '</p>' : '')
        + (more ? '<div class="news-more"><div class="news-more-in">' + more + '</div></div>'
          + '<div class="news-foot"><button class="news-toggle" type="button" aria-expanded="false"><span class="t-open">' + T('Read more', '阅读更多')
          + '</span><span class="t-close">' + T('Show less', '收起') + '</span> <i class="fa fa-chevron-down" aria-hidden="true"></i></button></div>' : '')
        + '</div>';
    }

    function render() {
      const openIds = new Set(cards.filter(c => c.classList.contains('open')).map(c => c.dataset.id));
      cards.forEach(c => c.remove());
      cards = rows.map(m => {
        const a = document.createElement('article');
        a.className = 'news-card ch-db' + (openIds.has(m.id) ? ' open' : '');
        a.dataset.id = m.id; a.innerHTML = cardHtml(m);
        const btn = a.querySelector('.news-toggle');
        if (btn) { btn.setAttribute('aria-expanded', a.classList.contains('open')); btn.addEventListener('click', () => btn.setAttribute('aria-expanded', a.classList.toggle('open'))); }
        a.querySelectorAll('[data-photo]').forEach(b => b.addEventListener('click', () => showPhoto(b.dataset.photo, b.querySelector('img').alt)));
        return a;
      });
      newsGrid.prepend(...cards);
    }

    function showPhoto(src, alt) {   // uses the page's own photo viewer
      const lb = document.querySelector('.lb');
      if (!lb) { window.open(src, '_blank', 'noopener'); return; }
      const img = lb.querySelector('img'), cap = lb.querySelector('figcaption');
      img.src = src; img.alt = alt; if (cap) cap.textContent = alt;
      lb.classList.add('on');
    }

    render();
    onLangChange(render);
  }
})();
