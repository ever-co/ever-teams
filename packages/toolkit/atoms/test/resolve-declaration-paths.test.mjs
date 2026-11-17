// The published declarations carry no path alias: node --test test/*.test.mjs (from packages/toolkit/atoms).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { DECLARATION_ALIASES, resolveDeclarationPaths } from '../scripts/resolve-declaration-paths.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');

test('every alias of tsconfig.json is rewritten', () => {
	const configPath = path.join(here, '..', 'tsconfig.json');
	const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
	const aliases = Object.entries(config.compilerOptions.paths).map(([alias, [target]]) => [
		alias.replace(/\*$/, ''),
		target.replace(/^src\//, '').replace(/\*$/, '')
	]);

	assert.deepEqual(Object.fromEntries(aliases), DECLARATION_ALIASES);
});

test('aliased imports, re-exports and import types become relative paths', () => {
	const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-declarations-'));
	try {
		const dir = path.join(dist, 'lib', 'components', 'timer');
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, 'index.d.ts');
		fs.writeFileSync(
			file,
			[
				"import { Time } from '@components/teams-time-trackers/common/time';",
				"export { useTimer } from '@hooks/useTimer';",
				"export type Store = import('@lib/stores/kit-preferences').KitPreferences;",
				"import { cn } from '@ever-teams/toolkit-ui';"
			].join('\n')
		);

		assert.equal(resolveDeclarationPaths(dist), 1);
		const out = fs.readFileSync(file, 'utf8');
		assert.match(out, /from '\.\.\/teams-time-trackers\/common\/time'/);
		assert.match(out, /from '\.\.\/\.\.\/hooks\/useTimer'/);
		assert.match(out, /import\('\.\.\/\.\.\/stores\/kit-preferences'\)/);
		assert.match(out, /from '@ever-teams\/toolkit-ui'/);
		assert.doesNotMatch(out, /'@(components|hooks|lib|libs|utils)\//);
	} finally {
		fs.rmSync(dist, { recursive: true, force: true });
	}
});
