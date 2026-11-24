/**
 * postinstall of this workspace: runs `postinstall:app` from package.json,
 * unless SKIP_SERVER_WEB_POSTINSTALL is `true` or `1`.
 *
 * `postinstall:app` runs `electron-builder install-app-deps`, whose nested
 * `yarn install` in release/app follows the `resolved` URLs of
 * release/app/yarn.lock. Those point at the public npm registry, and yarn 1
 * fetches a lockfile URL as written, so that install ignores the registry a CI
 * job sets up for the root install (its npm cache). In jobs that never build
 * this app it downloaded every @img/sharp-* package from the public registry
 * and failed the whole job on a slow uplink (mobile.before-merge.yml,
 * 2026-11-18). Those jobs set SKIP_SERVER_WEB_POSTINSTALL=true on their
 * install step.
 *
 * Unset, as for developers and the desktop server-web builds, `postinstall:app`
 * runs exactly as the postinstall did before.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { scripts } from '../../package.json';

const skip = (process.env.SKIP_SERVER_WEB_POSTINSTALL || '')
  .trim()
  .toLowerCase();

if (skip === 'true' || skip === '1') {
  console.log(
    'SKIP_SERVER_WEB_POSTINSTALL is set: skipping the server-web postinstall (install-app-deps, build:dll).',
  );
  process.exit(0);
}

// A shell runs the chain the way yarn runs a script (sh -c, or cmd.exe on
// Windows), with this process's environment: PATH keeps node_modules/.bin, and
// electron-builder still detects yarn as the package manager.
const result = spawnSync(scripts['postinstall:app'], {
  cwd: path.join(__dirname, '../..'),
  shell: true,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
