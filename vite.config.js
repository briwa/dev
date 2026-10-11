import { defineConfig } from 'vite';
import { build, OUT } from './build.js';
import { GISTS_DIR } from './src/gists.js';

// Dev only: serve the generated site and regenerate it when a source file or a downloaded
// gist changes. `npm run gists` refreshes the downloads from GitHub.
function siteBuild() {
  let queue = Promise.resolve();
  const rebuild = () => (queue = queue.then(build));
  const watched = new RegExp(`[\\\\/](src|${GISTS_DIR})[\\\\/]`);

  return {
    name: 'site-build',
    async configureServer(server) {
      await rebuild();
      server.watcher.add(['src', GISTS_DIR]);
      const onChange = (file) => {
        if (!watched.test(file)) return;
        rebuild()
          .then(() => server.ws.send({ type: 'full-reload' }))
          .catch((err) => server.config.logger.error(err.stack));
      };
      for (const event of ['add', 'change', 'unlink']) server.watcher.on(event, onChange);
    },
  };
}

export default defineConfig({
  root: OUT,
  appType: 'mpa',
  publicDir: false,
  plugins: [siteBuild()],
});
