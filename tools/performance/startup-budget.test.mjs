import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
	DEFAULT_SHELL_READY_BUDGET_MS,
	DEFAULT_SHELL_READY_CEILING_MS,
	evaluateShellReady
} from './startup-budget.mjs';

function samplesOf(...values) {
	return values.map((shellReadyMs, position) => ({ index: position + 1, shellReadyMs }));
}

test('holds the median of the cold samples to the budget', () => {
	const result = evaluateShellReady(samplesOf(6_111, 6_496, 7_091, 6_709, 7_399));

	assert.deepEqual(result, {
		budgetMs: DEFAULT_SHELL_READY_BUDGET_MS,
		ceilingMs: DEFAULT_SHELL_READY_CEILING_MS,
		medianMs: 6_709,
		maxMs: 7_399,
		samplesOverBudget: 0,
		failures: []
	});
});

test('tolerates one or two samples slowed by a loaded runner', () => {
	// Shaped on runs 39232600059 and 39291156553 (2026-10-19): the last of five samples took 9.9 s / 10.2 s
	// while the samples before it, and every rerun of the same code, measured 6-8 s.
	const one = evaluateShellReady(samplesOf(7_872, 6_144, 6_192, 6_024, 10_233));
	const two = evaluateShellReady(samplesOf(8_460, 6_144, 6_192, 6_024, 9_923));

	assert.deepEqual(one.failures, []);
	assert.equal(one.medianMs, 6_192);
	assert.equal(one.samplesOverBudget, 1);
	assert.deepEqual(two.failures, []);
	assert.equal(two.samplesOverBudget, 2);
});

test('rejects a regression that slows most cold starts past the budget', () => {
	const result = evaluateShellReady(samplesOf(7_000, 8_100, 8_200, 8_300, 6_000));

	assert.equal(result.medianMs, 8_100);
	assert.deepEqual(result.failures, [
		'Median shell-ready 8,100 ms of 5 cold samples (7,000, 8,100, 8,200, 8,300, 6,000 ms) exceeds 8,000 ms.'
	]);
});

test('rejects any single sample over the hard ceiling even when the median is fast', () => {
	const result = evaluateShellReady(samplesOf(4_000, 4_100, 15_001, 4_200, 4_300));

	assert.equal(result.medianMs, 4_200);
	assert.deepEqual(result.failures, ['Sample 3: shell-ready 15,001 ms exceeds the per-sample ceiling of 15,000 ms.']);
});

test('accepts values exactly at the budget and at the ceiling', () => {
	const result = evaluateShellReady(samplesOf(8_000, 8_000, 8_000, 15_000, 15_000));

	assert.deepEqual(result.failures, []);
	assert.equal(result.medianMs, 8_000);
});

test('reports invalid timings and keeps them out of the median', () => {
	const result = evaluateShellReady([
		{ index: 1, shellReadyMs: 0 },
		{ index: 2, shellReadyMs: Number.NaN },
		{ index: 3, shellReadyMs: 5_000 }
	]);

	assert.equal(result.medianMs, 5_000);
	assert.deepEqual(result.failures, [
		'Sample 1: shell-ready timing is missing or invalid.',
		'Sample 2: shell-ready timing is missing or invalid.'
	]);
	assert.equal(evaluateShellReady([]).medianMs, null);
});

test('uses the upper middle for an even count, so a missing sample never loosens the budget', () => {
	const result = evaluateShellReady(samplesOf(7_000, 7_500, 8_100, 8_200));

	assert.equal(result.medianMs, 8_100);
	assert.match(result.failures.join('\n'), /Median shell-ready 8,100 ms of 4 cold samples/);
});

test('honours explicit budget and ceiling options', () => {
	const result = evaluateShellReady(samplesOf(900, 1_000, 1_100), { budgetMs: 950, ceilingMs: 1_050 });

	assert.deepEqual(result.failures, [
		'Sample 3: shell-ready 1,100 ms exceeds the per-sample ceiling of 1,050 ms.',
		'Median shell-ready 1,000 ms of 3 cold samples (900, 1,000, 1,100 ms) exceeds 950 ms.'
	]);
});

test('stays importable by the Cypress browser bundle', () => {
	const source = readFileSync(new URL('./startup-budget.mjs', import.meta.url), 'utf8');

	assert.doesNotMatch(source, /['"]node:/);
	assert.doesNotMatch(source, /\brequire\(|\bimport\s*\(/);
});
