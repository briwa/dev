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

function layout({ title, body, script = '' }) {
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
  </head>
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

function postCard({ title, href, excerpt, cover }) {
  const face = cover
    ? `<a class="jr-cover jr-card-cover" href="${href}" tabindex="-1" aria-hidden="true" style="--fig-ar: ${cover.w} / ${cover.h}">
        <iframe class="jr-cover-frame" sandbox="allow-scripts" srcdoc="${escapeAttr(cover.srcdoc)}" title="figure preview" tabindex="-1"></iframe>
      </a>`
    : `<p class="jr-card-excerpt">${escapeHtml(excerpt)}</p>`;
  return `<div class="jr-card">
      <a class="jr-card-link" href="${href}" aria-label="${escapeAttr(title)}"></a>
      ${face}
      <span class="jr-card-title">${escapeHtml(title)}</span>
    </div>`;
}

const INDEX_SCRIPT = `
import { MSG_PLAY } from '@briwa.dev/sandbox';
import { pushFigureTheme } from '@briwa.dev/sandbox/client';

for (const frame of document.querySelectorAll('.jr-cover-frame')) {
  pushFigureTheme(frame.contentWindow);
  frame.addEventListener('load', () => pushFigureTheme(frame.contentWindow));
}

const play = (el, on) =>
  el.querySelector('iframe')?.contentWindow?.postMessage({ [MSG_PLAY]: on }, '*');

for (const cover of document.querySelectorAll('.jr-card-cover')) {
  let timer;
  cover.addEventListener('mouseenter', () => {
    timer = setTimeout(() => play(cover, true), 500);
  });
  cover.addEventListener('mouseleave', () => {
    clearTimeout(timer);
    play(cover, false);
  });
}
`;

export function indexPage(cards) {
  const body = cards.length
    ? `<div class="jr-grid">\n${cards.map(postCard).join('\n')}\n</div>`
    : `<p class="jr-empty">No entries yet.</p>`;
  return layout({ body, script: cards.length ? INDEX_SCRIPT : '' });
}

const POST_SCRIPT = `
import { mountFigures } from '@briwa.dev/sandbox/client';
mountFigures();
`;

const navLink = (post, dir) =>
  dir === 'prev'
    ? `<a class="entry-nav-link prev" href="${post.href}"><span class="nav-arrow">←</span><span class="nav-t">${escapeHtml(post.title)}</span></a>`
    : `<a class="entry-nav-link next" href="${post.href}"><span class="nav-t">${escapeHtml(post.title)}</span><span class="nav-arrow">→</span></a>`;

export function postPage({ title, html, newer, older }) {
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
  return layout({ title, body, script: POST_SCRIPT });
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
