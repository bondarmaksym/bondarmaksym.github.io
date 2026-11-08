// 1) Fade/slide elements in as they scroll into view
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('show'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('show'));
}

// 2) Tool icons
// Several brands (Salesforce, Slack, Tableau, Excel, Power BI, ChatGPT, SendGrid, LaunchDarkly,
// Power Automate, Monday.com) were removed from the current Simple Icons library, so each icon
// is tried from up to three sources, then falls back to a lettered badge (never blank).
//   a) current Simple Icons CDN      (coloured SVG)
//   b) Simple Icons v9 on jsDelivr   (older release that still has the removed brands)
//   c) Iconify "logos" set           (official multicolour logos)
const SQL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';
const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const TIMEOUT = 7000;

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => reject(new Error('timeout')), TIMEOUT);
    img.onload = () => { clearTimeout(t); img.naturalWidth ? resolve(img) : reject(new Error('empty')); };
    img.onerror = () => { clearTimeout(t); reject(new Error('error')); };
    img.alt = '';
    img.src = url;
  });
}

async function loadInlineSvg(url, color) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('http ' + res.status);
    const text = await res.text();
    if (!/<svg[\s>]/.test(text)) throw new Error('not svg');
    const wrap = document.createElement('span');
    wrap.innerHTML = text.replace(/<svg/, '<svg fill="#' + color + '"');
    return wrap.firstElementChild;
  } finally { clearTimeout(t); }
}

async function resolveIcon(li) {
  const slug = li.dataset.icon;
  const color = (dark && li.dataset.dark) || li.dataset.color || '64748B';
  const attempts = [
    ['a', () => loadImg('https://cdn.simpleicons.org/' + slug + '/' + color)],
    ['b', () => loadInlineSvg('https://cdn.jsdelivr.net/npm/simple-icons@9/icons/' + slug + '.svg', color)],
  ];
  if (li.dataset.iconify) {
    attempts.push(['c', () => loadImg('https://api.iconify.design/logos/' + li.dataset.iconify + '.svg')]);
  }
  for (const [tag, run] of attempts) {
    try { return { node: await run(), tag }; } catch (e) { /* try next source */ }
  }
  return null;
}

async function setupTool(li) {
  li.dataset.name = li.textContent.trim();
  const holder = document.createElement('span');
  holder.className = 'ti';
  li.prepend(holder);

  if (li.dataset.icon === 'sql') {          // SQL has no brand logo: use a database glyph
    holder.classList.add('db');
    holder.innerHTML = SQL_SVG;
    li.dataset.src = 'inline';
    return true;
  }

  const found = await resolveIcon(li);
  if (found) {
    holder.appendChild(found.node);
    li.dataset.src = found.tag;
    return true;
  }
  // Fallback badge with the first letter, so a tool never shows a blank/broken icon
  holder.classList.add('mono');
  holder.style.setProperty('--c', '#' + (li.dataset.color || '64748B'));
  holder.textContent = li.dataset.name.charAt(0).toUpperCase();
  li.dataset.src = 'letter';
  return false;
}

const tools = [...document.querySelectorAll('.tools li[data-icon]')];
Promise.all(tools.map(setupTool)).then(() => {
  const fallback = tools.filter((li) => li.dataset.src === 'letter').map((li) => li.dataset.name);
  if (fallback.length) console.warn('Icons using letter fallback:', fallback);

  // Self-test: open the site with ?icons=check to see which source each icon came from
  if (new URLSearchParams(location.search).get('icons') === 'check') {
    const box = document.createElement('div');
    box.className = 'icon-report' + (fallback.length ? ' bad' : '');
    box.textContent = fallback.length
      ? 'Icons: ' + (tools.length - fallback.length) + '/' + tools.length + ' loaded. Missing: ' + fallback.join(', ')
      : 'Icons: all ' + tools.length + ' loaded ✓';
    document.body.appendChild(box);
  } else {
    tools.forEach((li) => { li.removeAttribute('data-src'); li.removeAttribute('data-name'); });
  }
});
