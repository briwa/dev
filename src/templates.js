import { escapeHtml, escapeAttr } from '@briwa.dev/sandbox';

export const SITE_NAME = 'briwa.dev';

// The sandbox client is served straight from its dist (its chunks import each other by
// relative path), so page scripts can name the package the way they would in a bundler.
const IMPORT_MAP = JSON.stringify({
  imports: {
    '@briwa.dev/sandbox': '/vendor/sandbox/core/index.js',
    '@briwa.dev/sandbox/client': '/vendor/sandbox/client/index.js',
  },
});

function layout({ title, body, script = '', head = '' }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title || SITE_NAME)}</title>
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/styles.css" />
    <script type="importmap">${IMPORT_MAP}</script>
${head}  </head>
  <body>
    <div class="wrap">
      <header class="site-head">
        <a class="brand" href="/">${SITE_NAME}</a>
        <nav>
          <a href="/about/">About</a>
        </nav>
      </header>
      <main>
${body}
      </main>
    </div>
${script ? `    <script type="module">${script}</script>\n` : ''}  </body>
</html>
`;
}

// A card as vist's /u/ draws one: title and date, then the thumb (@briwa.dev/sandbox/post's)
// or else the excerpt. A thumb fits THUMB_MAX square, its ratio kept, at most the card's
// width and centred; a figure's frame scales what it draws, and plays while the card is hovered.
const THUMB_MAX = 320;
const fitWidth = (w, h) => Math.round(w * Math.min(1, THUMB_MAX / w, THUMB_MAX / h));

function thumbFace(thumb) {
  if (thumb.kind === 'image') {
    const box = thumb.size
      ? `width: ${fitWidth(...thumb.size)}px; aspect-ratio: ${thumb.size[0]} / ${thumb.size[1]}`
      : `max-width: min(100%, ${THUMB_MAX}px); max-height: ${THUMB_MAX}px`;
    return `<img class="jr-thumb" src="${escapeAttr(thumb.src)}" alt="" loading="lazy" style="${box}" />`;
  }
  return `<iframe class="jr-thumb jr-thumb-frame" sandbox="allow-scripts" srcdoc="${escapeAttr(thumb.srcdoc)}" title="figure preview" tabindex="-1" aria-hidden="true" loading="lazy" style="width: ${fitWidth(thumb.w, thumb.h)}px; aspect-ratio: ${thumb.w} / ${thumb.h}"></iframe>`;
}

// `2026-07-18` as vist shows it: `Jul 18, 2026`. The date is midnight UTC; read it there.
const formatDate = (date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

function postCard({ title, href, date, excerpt, thumb }) {
  const face = thumb
    ? thumbFace(thumb)
    : excerpt
      ? `<p class="jr-card-excerpt">${escapeHtml(excerpt)}</p>`
      : '';
  return `<a class="jr-card" href="${href}">
      <div class="jr-card-head">
        <h2 class="jr-card-title">${escapeHtml(title)}</h2>
        <time class="jr-card-date" datetime="${date.toISOString().slice(0, 10)}">${formatDate(date)}</time>
      </div>
      ${face}
    </a>`;
}

const INDEX_SCRIPT = `
import { enterFigure, leaveFigure, pushFigureTheme } from '@briwa.dev/sandbox/client';

for (const frame of document.querySelectorAll('.jr-thumb-frame')) {
  frame.addEventListener('load', () => pushFigureTheme(frame.contentWindow));
}

for (const card of document.querySelectorAll('.jr-card')) {
  const frame = card.querySelector('.jr-thumb-frame');
  if (!frame) continue;
  let timer;
  card.addEventListener('mouseenter', () => {
    timer = setTimeout(() => enterFigure(frame), 500);
  });
  card.addEventListener('mouseleave', () => {
    clearTimeout(timer);
    leaveFigure(frame);
  });
}
`;

export function indexPage(cards) {
  const body = cards.length
    ? `<div class="jr-list">\n${cards.map(postCard).join('\n')}\n</div>`
    : `<p class="jr-empty">No entries yet.</p>`;
  return layout({ body, script: cards.length ? INDEX_SCRIPT : '' });
}

// The post is served for any slug after its id, so the address bar is put right here.
const postScript = (href) => `
import { mountFigures } from '@briwa.dev/sandbox/client';
mountFigures();

const canonical = ${JSON.stringify(href)};
if (location.pathname !== canonical) history.replaceState(null, '', canonical + location.search + location.hash);
`;

const navLink = (post, dir) =>
  dir === 'prev'
    ? `<a class="entry-nav-link prev" href="${post.href}"><span class="nav-arrow">←</span><span class="nav-t">${escapeHtml(post.title)}</span></a>`
    : `<a class="entry-nav-link next" href="${post.href}"><span class="nav-t">${escapeHtml(post.title)}</span><span class="nav-arrow">→</span></a>`;

export function postPage({ title, href, html, newer, older }) {
  const nav =
    newer || older
      ? `<nav class="entry-nav">
  ${newer ? navLink(newer, 'prev') : '<span></span>'}
  ${older ? navLink(older, 'next') : '<span></span>'}
</nav>`
      : '';
  const body = `<article id="entry-view">
  <h1 class="entry-h1">${escapeHtml(title)}</h1>
  <div class="prose">${html}</div>
</article>
${nav}
<a class="back" href="/">← Home</a>`;
  const head = `    <link rel="canonical" href="https://${SITE_NAME}${href}" />\n`;
  return layout({ title, body, head, script: postScript(href) });
}

const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

export function aboutPage() {
  const body = `<article class="about prose">
  <p>Hello! I'm Briwa. I'm a full-stack developer.</p>
  <p>My main interest is data visualization.</p>
  <ul>
    <li>${ext('https://web.archive.org/web/20250214084349/https://www.wgs.co.id', 'WGS')}, 2013-2014</li>
    <li>${ext('https://web.archive.org/web/20250115025644/https://piktochart.com', 'Piktochart')}, 2014-2020</li>
    <li>${ext('https://web.archive.org/web/20250423233535/https://angelswing.io', 'Angelswing')}, 2020-2021</li>
    <li>${ext('https://web.archive.org/web/20250809101344/https://chartmogul.com', 'ChartMogul')}, 2021-present</li>
  </ul>
  <hr />
  <p>${ext('https://github.com/briwa', 'GitHub')} · ${ext('https://www.linkedin.com/in/shabriwa-shalat-74bb3960', 'LinkedIn')} · <a href="mailto:hello@briwa.dev">Email</a></p>
</article>`;
  return layout({ title: 'About', body });
}
