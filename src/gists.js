import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const API = 'https://api.github.com';
const USER = 'briwa';
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Downloaded posts land here as gists/<gist id>/<filename>.md; the folder is gitignored.
export const GISTS_DIR = 'gists';

async function get(url, as = 'json') {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  return res[as]();
}

async function listGists() {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await get(`${API}/users/${USER}/gists?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

function splitFrontmatter(src) {
  const m = FRONTMATTER.exec(src);
  if (!m) return { data: {}, body: src };
  return { data: parseYaml(m[1]) ?? {}, body: src.slice(m[0].length) };
}

// Every public .md file in my gists whose frontmatter opts in with `sandbox: true`. The
// folder is replaced wholesale, so a gist that was deleted or opted out disappears too.
export async function downloadGists() {
  const gists = await listGists();
  const files = gists.flatMap((g) =>
    Object.values(g.files)
      .filter((f) => f.filename.toLowerCase().endsWith('.md'))
      .map((f) => ({ id: g.id, file: f }))
  );

  const fetched = await Promise.all(
    files.map(async ({ id, file }) => ({ id, filename: file.filename, src: await get(file.raw_url, 'text') }))
  );
  const posts = fetched.filter(({ src }) => splitFrontmatter(src).data.sandbox === true);

  await rm(GISTS_DIR, { recursive: true, force: true });
  for (const { id, filename, src } of posts) {
    await mkdir(join(GISTS_DIR, id), { recursive: true });
    await writeFile(join(GISTS_DIR, id, filename), src);
  }

  console.log(`downloaded ${posts.length} sandbox gist(s) → ${GISTS_DIR}/`);
  for (const p of posts) console.log(`  ${p.id}/${p.filename}`);
}

// The downloaded posts, newest first, drafts left out.
export async function loadPosts() {
  if (!existsSync(GISTS_DIR)) await downloadGists();

  const entries = await readdir(GISTS_DIR, { recursive: true, withFileTypes: true });
  const posts = await Promise.all(
    entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
      .map(async (e) => {
        const id = e.parentPath.split(/[\\/]/).pop();
        const { data, body } = splitFrontmatter(await readFile(join(e.parentPath, e.name), 'utf8'));
        if (data.sandbox !== true || data.draft === true) return null;
        if (!data.title || !data.date) {
          console.warn(`[gists] ${id}/${e.name}: sandbox post without title/date, skipped`);
          return null;
        }
        return {
          id,
          filename: e.name,
          title: String(data.title),
          date: new Date(data.date),
          thumbLabel: data['sandbox-thumb-label'] ?? '',
          body,
        };
      })
  );

  return posts.filter(Boolean).sort((a, b) => b.date - a.date);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await downloadGists();
