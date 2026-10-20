import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { compareStartup, summarizeCandidate, summarizeHar } from './compare-startup.mjs';

function makeRequests(count, { duplicate = false, rich = false } = {}) {
	const requests = Array.from({ length: count }, (_, index) => ({
		method: 'GET',
		key: `GET /api/fixture/${index}`,
		routeKey: `GET /api/fixture/${index}`,
		startMs: 100 + index * 10,
		endMs: 150 + index * 10,
		richGlobalRead: rich && index === 0
	}));
	if (duplicate) requests[1].key = requests[0].key;
	return requests;
}

function makeCriticalRequests(count) {
	const criticalRouteKeys = [
		'GET /api/user/me',
		'GET /api/auth/workspaces',
		'GET /api/organization-team',
		'GET /api/tasks/team',
		'GET /api/timesheet/timer/status',
		'GET /api/daily-plan/me'
	];
	return Array.from({ length: count }, (_, index) => {
		const routeKey = criticalRouteKeys[index] ?? `GET /api/fixture/${index}`;
		return {
			method: 'GET',
			key: routeKey,
			routeKey,
			startMs: 100 + index * 10,
			endMs: 150 + index * 10,
			richGlobalRead: false
		};
	});
}

function makeCandidate(overrides = {}) {
	return {
		version: 1,
		mode: 'deterministic',
		samples: Array.from({ length: 5 }, (_, index) => ({
			index: index + 1,
			shellReadyMs: 900,
			requests: makeCriticalRequests(10),
			...overrides
		}))
	};
}

test('summarizes HAR timings with nearest-rank percentiles and separates GET reads', () => {
	const har = {
		log: {
			entries: [
				{ request: { method: 'OPTIONS', url: 'https://apidev.ever.team/api/tasks' }, time: 100 },
				{ request: { method: 'GET', url: 'https://apidev.ever.team/api/tasks' }, time: 200 },
				{ request: { method: 'GET', url: 'https://apidev.ever.team/api/roles' }, time: 30_001 },
				{ request: { method: 'GET', url: 'https://apidev.ever.team/api/invite' }, time: 43_200 },
				{ request: { method: 'GET', url: 'https://apidev.ever.team/api/auth/session' }, time: 99_000 },
				{ request: { method: 'GET', url: 'https://apidev.ever.team/api/health' }, time: 99_000 }
			]
		}
	};

	assert.deepEqual(summarizeHar(har, { apiOrigins: ['https://apidev.ever.team'] }), {
		transport: { count: 4, p50Ms: 200, p95Ms: 43_200, maxMs: 43_200, over30s: 2 },
		reads: { count: 3, p50Ms: 30_001, p95Ms: 43_200, maxMs: 43_200, over30s: 2 }
	});
});

test('accepts five cold samples inside every structural budget', () => {
	const summary = summarizeCandidate(makeCandidate());
	const result = compareStartup(summary);

	assert.equal(summary.sampleCount, 5);
	assert.equal(result.passed, true);
	assert.deepEqual(result.failures, []);
});

test('accepts ordinary team startup without preloading personal plans', () => {
	const summary = summarizeCandidate(makeCandidate({ requests: makeCriticalRequests(5) }));
	const result = compareStartup(summary);

	assert.equal(result.passed, true);
	assert.deepEqual(result.failures, []);
});

test('rejects missing samples, excessive reads, duplicate GETs, and rich global reads', () => {
	const candidate = makeCandidate({
		requests: makeRequests(21, { duplicate: true, rich: true }),
		shellReadyMs: 900
	});
	candidate.samples.pop();

	const result = compareStartup(summarizeCandidate(candidate));

	assert.equal(result.passed, false);
	assert.match(result.failures.join('\n'), /exactly 5 cold samples/i);
	assert.match(result.failures.join('\n'), /critical reads before shell-ready/i);
	assert.match(result.failures.join('\n'), /Gauzy requests in the first 5 seconds/i);
	assert.match(result.failures.join('\n'), /duplicate normalized GET/i);
	assert.match(result.failures.join('\n'), /rich global time-log\/report/i);
});

test('rejects cold samples that captured no Gauzy requests', () => {
	const result = compareStartup(summarizeCandidate(makeCandidate({ requests: [] })));

	assert.equal(result.passed, false);
	assert.match(result.failures.join('\n'), /captured no Gauzy requests/i);
});

test('rejects nonempty captures that omit critical shell route keys', () => {
	const result = compareStartup(summarizeCandidate(makeCandidate({ requests: makeRequests(10) })));

	assert.equal(result.passed, false);
	assert.match(result.failures.join('\n'), /missing critical route keys.*GET \/api\/user\/me/i);
	assert.match(result.failures.join('\n'), /GET \/api\/timesheet\/timer\/status/i);
});

test('rejects cold samples that exceed the shell-ready budget', () => {
	const result = compareStartup(summarizeCandidate(makeCandidate({ shellReadyMs: 8_001 })));

	assert.equal(result.passed, false);
	assert.match(result.failures.join('\n'), /shell-ready.*8,001.*8,000/i);
	assert.equal(result.shellReady.medianMs, 8_001);
});

test('holds the median shell-ready to the budget and every sample to the ceiling', () => {
	const withShellReady = (...values) => {
		const candidate = makeCandidate();
		values.forEach((value, position) => {
			candidate.samples[position].shellReadyMs = value;
		});
		return compareStartup(summarizeCandidate(candidate));
	};

	const loadedRunner = withShellReady(7_872, 6_144, 6_192, 6_024, 10_233);
	assert.equal(loadedRunner.passed, true);
	assert.deepEqual(loadedRunner.shellReady, {
		budgetMs: 8_000,
		ceilingMs: 15_000,
		medianMs: 6_192,
		maxMs: 10_233,
		samplesOverBudget: 1
	});

	const slowMajority = withShellReady(7_000, 8_100, 8_200, 8_300, 6_000);
	assert.equal(slowMajority.passed, false);
	assert.match(slowMajority.failures.join('\n'), /Median shell-ready 8,100 ms.*exceeds 8,000 ms/);

	const pathologicalSample = withShellReady(4_000, 4_100, 15_001, 4_200, 4_300);
	assert.equal(pathologicalSample.passed, false);
	assert.match(
		pathologicalSample.failures.join('\n'),
		/Sample 3: shell-ready 15,001 ms exceeds the per-sample ceiling/
	);
});

test('rejects a cold sample without a shell-ready timing', () => {
	const candidate = makeCandidate();
	delete candidate.samples[1].shellReadyMs;
	candidate.samples[3].shellReadyMs = true;
	candidate.samples[4].shellReadyMs = '900';

	const result = compareStartup(summarizeCandidate(candidate));

	assert.equal(result.passed, false);
	assert.match(result.failures.join('\n'), /Sample 2: shell-ready timing is missing or invalid/);
	assert.match(result.failures.join('\n'), /Sample 4: shell-ready timing is missing or invalid/);
	assert.match(result.failures.join('\n'), /Sample 5: shell-ready timing is missing or invalid/);
});

test('rejects a supplied HAR reference with no matching Gauzy traffic', () => {
	const baseline = summarizeHar({ log: { entries: [] } });
	const result = compareStartup(summarizeCandidate(makeCandidate()), { baseline });

	assert.equal(result.passed, false);
	assert.match(result.failures.join('\n'), /HAR reference captured no Gauzy requests/i);
});

test('CLI makes a supplied empty HAR reference fail the comparison', (context) => {
	const directory = mkdtempSync(join(tmpdir(), 'ever-teams-startup-'));
	context.after(() => rmSync(directory, { recursive: true, force: true }));
	const candidatePath = join(directory, 'candidate.json');
	const baselinePath = join(directory, 'baseline.har');
	writeFileSync(candidatePath, JSON.stringify(makeCandidate()), 'utf8');
	writeFileSync(baselinePath, JSON.stringify({ log: { entries: [] } }), 'utf8');

	const script = join(dirname(fileURLToPath(import.meta.url)), 'compare-startup.mjs');
	const result = spawnSync(process.execPath, [script, `--candidate=${candidatePath}`, `--baseline=${baselinePath}`], {
		encoding: 'utf8'
	});
	const report = JSON.parse(result.stdout);

	assert.equal(result.status, 1);
	assert.equal(report.comparison.passed, false);
	assert.match(report.comparison.failures.join('\n'), /HAR reference captured no Gauzy requests/i);
});

test('keeps A and B employee query scopes distinct for duplicate detection', () => {
	const requests = makeRequests(2);
	requests[0].key = 'GET /api/timesheet/statistics/profile-activity?employeeId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
	requests[1].key = 'GET /api/timesheet/statistics/profile-activity?employeeId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
	const summary = summarizeCandidate(makeCandidate({ requests }));

	assert.equal(summary.samples[0].duplicateGetCount, 0);
});
