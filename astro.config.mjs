import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sandbox, { remarkSandbox, remarkStripHtml, shikiHighlight } from '@briwa.dev/sandbox/astro';
import { remarkExternalLinks } from './src/lib/remarkExternalLinks.js';

const CODE_THEME = 'one-dark-pro';

export default defineConfig({
  integrations: [sandbox({ remark: false, styles: false })],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: CODE_THEME },
    processor: unified({
      remarkPlugins: [
        remarkStripHtml,
        [remarkSandbox, { highlight: shikiHighlight({ theme: CODE_THEME }) }],
        remarkExternalLinks,
      ],
    }),
  },
});
