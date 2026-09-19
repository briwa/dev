import {
  findSandboxBlocks,
  buildSrcdoc,
  buildVueSrcdoc,
  sandboxPrelude,
  sandboxExternals,
  sandboxVueComponents,
} from '@briwa.dev/sandbox';

const NON_PROSE = /^(#{1,6}\s|!\[|>|`{3,}|~{3,})/;

function leadProse(md) {
  const out = [];
  for (const block of md.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text) continue;
    if (NON_PROSE.test(text)) {
      if (out.length) break;
      continue;
    }
    out.push(text);
  }
  const joined = out.join(' ').replace(/\s+/g, ' ');
  return (joined || md.trim().replace(/\s+/g, ' ')).slice(0, 1500);
}

function toText(md) {
  return md
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/([*_])([^*_]+)\1/g, '$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\s-]+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickCover(body) {
  const blocks = findSandboxBlocks(body);
  const figures = blocks.filter((b) => b.closed && !b.snippet && !b.external && !b.vueLib);
  if (!figures.length) return null;

  const figure = figures.find((f) => f.preview) ?? figures[0];
  const externals = sandboxExternals(blocks, figure.id);
  const srcdoc = figure.vue
    ? buildVueSrcdoc(figure, figure.code, {
        externals,
        components: sandboxVueComponents(blocks, figure.id),
      })
    : buildSrcdoc(
        { ...figure, hover: true },
        figure.code,
        sandboxPrelude(blocks, figure.id),
        externals,
      );

  return { srcdoc, w: figure.w, h: figure.h };
}

export function entryPreview(body = '') {
  let excerpt = toText(leadProse(body || ''));
  if (excerpt.length > 220) excerpt = excerpt.slice(0, 220).replace(/\s+\S*$/, '') + '…';

  return { excerpt, cover: pickCover(body || '') };
}
