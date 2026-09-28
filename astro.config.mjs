import { defineConfig } from 'astro/config';
import sandbox from '@briwa.dev/sandbox/astro';

const CODE_THEME = 'one-dark-pro';

// The integration installs the whole markdown pipeline — figures, raw-HTML stripping,
// link checking — on a unified processor, so a post renders here the way it does in the
// editor's preview. Styles stay off because global.css imports figure.css itself.
export default defineConfig({
  integrations: [sandbox({ styles: false, shiki: { theme: CODE_THEME } })],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: CODE_THEME },
  },
});
