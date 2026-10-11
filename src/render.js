import { codeToHtml, bundledLanguages } from 'shiki';
import { createMarkdownRenderer } from '@briwa.dev/sandbox/markdown';

const CODE_THEME = 'one-dark-pro';

const highlight = (code, lang = 'js') => codeToHtml(code, { lang, theme: CODE_THEME });

// One shiki for figures and ordinary fences alike, in every language it bundles. `lazy`
// defers each figure frame until it nears the viewport; mountFigures on the page loads them.
export const renderMarkdown = createMarkdownRenderer({
  highlight,
  fences: true,
  languages: Object.keys(bundledLanguages),
  lazy: true,
});
