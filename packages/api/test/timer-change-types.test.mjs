// timerChangeOf and timer.watch against the client's declared types: node --test test/*.test.mjs (from packages/api,
// after `rollup -c`). tsc compiles a strict host that passes what timer.status() answers to timerChangeOf, as the
// README shows, and one that passes the kit's ITimerStatus.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const declarations = path.join(here, '..', 'dist', 'index.js').split(path.sep).join('/');

const HOST = `
import { createClient, timerChangeOf } from '${declarations}';
import type { TimerChange } from '${declarations}';
import type { ITimerStatus } from '@ever-teams/toolkit-types';

const teams = createClient({ apiUrl: 'http://localhost:3000/api', token: 'token' });

export async function fromTheClient(previous: TimerChange | null): Promise<TimerChange | null> {
	return timerChangeOf(await teams.timer.status(), previous);
}

export function fromTheKit(status: ITimerStatus): TimerChange | null {
	return timerChangeOf(status, null);
}

export const stopWatching: () => void = teams.timer.watch((change: TimerChange) => {
	const running: boolean = change.running;
	return running;
});
`;

let checkDir;
let output;

before(() => {
	assert.ok(fs.existsSync(path.join(here, '..', 'dist', 'index.d.ts')), 'build the package first: rollup -c');
	// In dist, so that @ever-teams/toolkit-types resolves as it does for the package itself.
	checkDir = fs.mkdtempSync(path.join(here, '..', 'dist', 'timer-change-types-'));
	fs.writeFileSync(path.join(checkDir, 'host.ts'), HOST);
	const tsconfig = {
		compilerOptions: {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: 'es2022',
			lib: ['es2022', 'dom'],
			module: 'esnext',
			moduleResolution: 'bundler',
			types: []
		},
		files: ['host.ts']
	};
	fs.writeFileSync(path.join(checkDir, 'tsconfig.json'), JSON.stringify(tsconfig));
	const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
	const run = spawnSync(process.execPath, [tsc, '-p', checkDir, '--pretty', 'false'], { encoding: 'utf8' });
	output = run.stdout.trim();
});

after(() => {
	fs.rmSync(checkDir, { recursive: true, force: true });
});

test("timerChangeOf takes what timer.status() answers and the kit's ITimerStatus, and watch hands a TimerChange", () => {
	assert.equal(output, '');
});
