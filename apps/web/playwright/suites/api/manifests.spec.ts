import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { expect, test } from '../../api-fixtures';

/**
 * The server-route suites run over lists generated from the source (`routes.generated.ts`,
 * `foreign-origin.generated.ts`). A handler added after the last regeneration would otherwise go untested
 * without anyone noticing, so this fails until the lists are regenerated. It needs no server: each collector
 * runs in `--check` mode, which writes nothing.
 */
const SCRIPTS = resolve(__dirname, '../../scripts');

for (const script of ['collect-api-routes.mjs', 'collect-foreign-origin-routes.mjs']) {
	test(`${script} has nothing to regenerate`, () => {
		let output = '';
		let failed = false;
		try {
			output = execFileSync(process.execPath, [resolve(SCRIPTS, script), '--check'], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe']
			});
		} catch (error) {
			failed = true;
			const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
			output = `${stdout}${stderr}`;
		}
		expect(failed, output.trim()).toBe(false);
	});
}
