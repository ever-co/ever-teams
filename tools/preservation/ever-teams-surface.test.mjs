import assert from 'node:assert/strict';
import { accessSync, chmodSync, constants, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const toolPath = resolve(dirname(fileURLToPath(import.meta.url)), 'ever-teams-surface.mjs');
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const knownGitCandidates =
	process.platform === 'win32'
		? [String.raw`C:\Program Files\Git\cmd\git.exe`, String.raw`C:\Program Files\Git\bin\git.exe`]
		: ['/usr/bin/git', '/usr/local/bin/git'];
const knownGit = knownGitCandidates.find((candidate) => {
	try {
		if (process.platform !== 'win32') accessSync(candidate, constants.X_OK);
		const result = spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true });
		return result.status === 0 && /^git version\b/i.test(result.stdout.trim());
	} catch {
		return false;
	}
});

function runResolverProbe(directory, environment = {}) {
	const output = join(directory, 'unused-report.json');
	const env = { ...process.env, ...environment };
	if (environment.EVER_TEAMS_GIT_EXECUTABLE === undefined) delete env.EVER_TEAMS_GIT_EXECUTABLE;
	return spawnSync(
		process.execPath,
		[
			toolPath,
			'--base=refs/heads/__missing_preservation_resolver_test__',
			'--head=refs/heads/__missing_preservation_resolver_test__',
			'--allow=[]',
			`--out=${output}`
		],
		{ cwd: repositoryRoot, encoding: 'utf8', env }
	);
}

test(
	'skips non-executable configured and PATH candidates before using known Git',
	{ skip: process.platform === 'win32' || !knownGit },
	(context) => {
		const directory = mkdtempSync(join(tmpdir(), 'ever-teams-preservation-git-'));
		context.after(() => rmSync(directory, { recursive: true, force: true }));
		const shadowDirectory = join(directory, 'shadow');
		const configuredGit = join(directory, 'configured-git');
		const shadowGit = join(shadowDirectory, 'git');
		mkdirSync(shadowDirectory);
		writeFileSync(configuredGit, 'completion metadata only\n', { mode: 0o644 });
		writeFileSync(shadowGit, 'completion metadata only\n', { mode: 0o644 });
		chmodSync(configuredGit, 0o644);
		chmodSync(shadowGit, 0o644);

		const result = runResolverProbe(directory, {
			EVER_TEAMS_GIT_EXECUTABLE: configuredGit,
			PATH: shadowDirectory
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, /git rev-parse .* failed:/i);
		assert.doesNotMatch(result.stderr, /EACCES|permission denied/i);
	}
);

test('skips a non-Git PATH shadow before using known Git', { skip: !knownGit }, (context) => {
	const directory = mkdtempSync(join(tmpdir(), 'ever-teams-preservation-git-shadow-'));
	context.after(() => rmSync(directory, { recursive: true, force: true }));
	const shadowGit = join(directory, process.platform === 'win32' ? 'git.exe' : 'git');
	const shadowContents =
		process.platform === 'win32'
			? 'completion metadata only\n'
			: '#!/bin/sh\necho completion metadata only\nexit 0\n';
	writeFileSync(shadowGit, shadowContents, { mode: 0o755 });
	if (process.platform !== 'win32') chmodSync(shadowGit, 0o755);

	const result = runResolverProbe(directory, { PATH: directory });

	assert.equal(result.status, 2);
	assert.match(result.stderr, /git rev-parse .* failed:/i);
	assert.doesNotMatch(result.stderr, /EACCES|EINVAL|ENOEXEC|permission denied/i);
});

test(
	'prefers an executable configured Git candidate over PATH and known locations',
	{ skip: process.platform === 'win32' },
	(context) => {
		const directory = mkdtempSync(join(tmpdir(), 'ever-teams-preservation-configured-git-'));
		context.after(() => rmSync(directory, { recursive: true, force: true }));
		const configuredGit = join(directory, 'configured-git');
		writeFileSync(
			configuredGit,
			'#!/bin/sh\nif [ "$1" = "--version" ]; then\n  echo "git version configured-test"\n  exit 0\nfi\necho CONFIGURED_GIT_MARKER >&2\nexit 7\n',
			{ mode: 0o755 }
		);
		chmodSync(configuredGit, 0o755);

		const result = runResolverProbe(directory, {
			EVER_TEAMS_GIT_EXECUTABLE: configuredGit,
			PATH: directory
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, /CONFIGURED_GIT_MARKER/);
	}
);
