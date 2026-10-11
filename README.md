# briwa.dev

Static site built from my public gists: every `.md` file whose frontmatter has `sandbox: true` becomes a post, rendered with `@briwa.dev/sandbox`.

- `npm run gists` downloads the opted-in gists into `gists/` (gitignored)
- `npm run dev` serves the site with vite, rebuilding on changes to `src/` or `gists/`
- `npm run build` downloads fresh gists and writes `dist/`
- `npm run preview` builds and serves `dist/` with wrangler
- `npm run deploy` builds and deploys
