// Builds the element, with the kit packages it bundles, when its dist/ has no build yet: the builder's dev server
// imports that build. turbo's build task has no cache, so an existing build is kept and the dev server starts at once.
// Usage, from the repository root: node packages/toolkit/embed/scripts/build-if-missing.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BUILT_ELEMENT = path.join(here, '..', 'dist', 'ever-teams-embed.js');
const REPOSITORY_ROOT = path.join(here, '..', '..', '..', '..');

// turbo runs on this Node from its own file, with no shell and no command looked up in PATH.
function buildElementWithTurbo() {
	const turbo = createRequire(path.join(REPOSITORY_ROOT, 'package.json')).resolve('turbo/bin/turbo');
	const result = spawnSync(process.execPath, [turbo, 'build', '--filter=@ever-teams/embed'], {
		cwd: REPOSITORY_ROOT,
		stdio: 'inherit'
	});
	return result.status ?? 1;
}

// The exit code: 0 when the build was already there, otherwise the build's own.
export function buildIfMissing({ built = BUILT_ELEMENT, build = buildElementWithTurbo } = {}) {
	if (fs.existsSync(built)) {
		return 0;
	}
	return build();
}

const isRunDirectly = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isRunDirectly) {
	process.exitCode = buildIfMissing();
}
