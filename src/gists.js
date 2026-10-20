import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readKey, splitFrontmatter } from '@briwa.dev/sandbox/post';

const API = 'https://api.github.com';
export const USER = 'briwa';
// A post's date is the YYYY-MM-DD its filename starts with, e.g. 2026-07-18-shuffle.md.
const FILENAME_DATE = /^(\d{4}-\d{2}-\d{2})-/;

// Downloaded posts land here as gists/<gist id>/<filename>.md; the folder is gitignored.
export const GISTS_DIR = 'gists';

// Public gists need no auth, but unauthenticated API calls are capped at 60 an hour per
// IP, and CI build machines share IPs, so CI sets GITHUB_PAT (a fine-grained PAT with
// no permissions) to get its own limit. Locally it can stay unset.
const headers = {
  Accept: 'application/vnd.github+json',
  ...(process.env.GITHUB_PAT && { Authorization: `Bearer ${process.env.GITHUB_PAT}` }),
};

async function get(url, as = 'json') {
  const res = await fetch(url, { headers });
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

const isSandbox = (src) => readKey(splitFrontmatter(src).frontmatter, 'sandbox') === 'true';

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
  const posts = fetched.filter(({ src }) => isSandbox(src));

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
        const text = await readFile(join(e.parentPath, e.name), 'utf8');
        const { frontmatter } = splitFrontmatter(text);
        if (!isSandbox(text) || readKey(frontmatter, 'draft') === 'true') return null;
        const title = readKey(frontmatter, 'title');
        const date = FILENAME_DATE.exec(e.name)?.[1];
        if (!title || !date) {
          console.warn(`[gists] ${id}/${e.name}: sandbox post without a title or a YYYY-MM-DD- filename, skipped`);
          return null;
        }
        return {
          id,
          filename: e.name,
          title,
          date: new Date(date),
          text,
        };
      })
  );

  return posts.filter(Boolean).sort((a, b) => b.date - a.date);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await downloadGists();
