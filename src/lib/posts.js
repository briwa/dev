import { getCollection } from 'astro:content';
import { entryPreview } from './entryPreview.js';

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export function postSlug(post) {
  const stem = slugify(post.data.title);
  return stem ? `${stem}-${post.id}` : post.id;
}

export const postHref = (post) => `/posts/${postSlug(post)}/`;

export async function loadPosts() {
  const posts = await getCollection('posts');
  return posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date - a.data.date);
}

export const toCard = (p) => ({
  title: p.data.title,
  href: postHref(p),
  ...entryPreview(p.body || '', { thumbLabel: p.data['sandbox-thumb-label'] }),
});
