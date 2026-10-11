import { mkdir, rm, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadPosts } from './src/gists.js';
import { renderMarkdown } from './src/render.js';
import { entryPreview } from './src/entryPreview.js';
import { indexPage, postPage, aboutPage } from './src/templates.js';

export const OUT = 'dist';
const sandboxRoot = dirname(createRequire(import.meta.url).resolve('@briwa.dev/sandbox/package.json'));

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

async function emit(path, content) {
  const file = join(OUT, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

// figure.css pulls in tokens.css by @import; inlined so the site ships one stylesheet.
async function stylesheet() {
  const read = (p) => readFile(p, 'utf8');
  const tokens = await read(join(sandboxRoot, 'styles/tokens.css'));
  const figure = (await read(join(sandboxRoot, 'styles/figure.css'))).replace(/^@import .*;\n?/m, '');
  return [tokens, figure, await read('src/styles/global.css')].join('\n');
}

export async function build() {
  const posts = (await loadPosts()).map((p) => ({
    ...p,
    href: `/posts/${[slugify(p.title), p.id.slice(0, 12)].filter(Boolean).join('-')}/`,
  }));

  await rm(OUT, { recursive: true, force: true });
  await cp('public', OUT, { recursive: true });
  await cp(join(sandboxRoot, 'dist'), join(OUT, 'vendor/sandbox'), {
    recursive: true,
    filter: (src) => !/[\\/](astro|markdown|remark)$/.test(src),
  });
  await emit('styles.css', await stylesheet());

  await emit(
    'index.html',
    indexPage(posts.map((p) => ({ title: p.title, href: p.href, ...entryPreview(p.body, { thumbLabel: p.thumbLabel }) })))
  );
  await emit('about/index.html', aboutPage());

  for (const [i, post] of posts.entries()) {
    const html = await renderMarkdown(post.body);
    await emit(
      join(post.href, 'index.html'),
      postPage({ title: post.title, html, newer: posts[i - 1], older: posts[i + 1] })
    );
  }

  console.log(`built ${posts.length} post(s) → ${OUT}/`);
  for (const p of posts) console.log(`  ${p.href}  (${p.filename})`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await build();
