#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_SHELL_READY_BUDGET_MS } from './startup-budget.mjs';

const REQUIRED_SHELL_ROUTE_KEYS = [
	'GET /api/user/me',
	'GET /api/auth/workspaces',
	'GET /api/organization-team',
	'GET /api/tasks/team',
	'GET /api/timesheet/timer/status'
];

function nearestRank(values, percentile) {
	if (!values.length) return null;
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(percentile * sorted.length) - 1];
}

function timingSummary(values) {
	return {
		count: values.length,
		p50Ms: nearestRank(values, 0.5),
		p95Ms: nearestRank(values, 0.95),
		maxMs: values.length ? Math.max(...values) : null,
		over30s: values.filter((value) => value >= 30_000).length
	};
}

function matchesApi(url, apiOrigins) {
	if (!url.pathname.startsWith('/api/')) return false;
	if (url.searchParams.has('_rsc') || /^\/api\/(?:auth\/session|health)(?:\/|$)/.test(url.pathname)) return false;
	if (apiOrigins?.length) return apiOrigins.some((origin) => new URL(origin).origin === url.origin);
	return /(?:^|\.)ever\.team$/i.test(url.hostname) || /(?:^|\.)gauzy\.co$/i.test(url.hostname);
}

export function summarizeHar(har, { apiOrigins = [] } = {}) {
	const entries = (har?.log?.entries ?? []).filter((entry) => {
		try {
			return matchesApi(new URL(entry.request.url), apiOrigins) && Number.isFinite(entry.time);
		} catch {
			return false;
		}
	});
	const reads = entries.filter((entry) => String(entry.request.method).toUpperCase() === 'GET');
	return {
		transport: timingSummary(entries.map((entry) => entry.time)),
		reads: timingSummary(reads.map((entry) => entry.time))
	};
}

export function summarizeCandidate(candidate) {
	const samples = (candidate?.samples ?? []).map((sample, index) => {
		const requests = Array.isArray(sample.requests) ? sample.requests : [];
		const shellReadyMs = Number(sample.shellReadyMs);
		const readsBeforeReady = requests.filter(
			(request) => request.method === 'GET' && Number(request.startMs) <= shellReadyMs
		);
		const firstFiveSeconds = requests.filter((request) => Number(request.startMs) <= 5_000);
		const routeKeys = new Set(requests.map((request) => request.routeKey));
		const seen = new Set();
		let duplicateGetCount = 0;
		for (const request of requests.filter((entry) => entry.method === 'GET')) {
			const identity = request.fingerprint ?? request.key;
			if (!identity) continue;
			if (seen.has(identity)) duplicateGetCount += 1;
			seen.add(identity);
		}
		const durations = requests
			.map((request) => Number(request.endMs) - Number(request.startMs))
			.filter((duration) => Number.isFinite(duration) && duration >= 0);

		return {
			index: sample.index ?? index + 1,
			shellReadyMs,
			requestCount: requests.length,
			missingCriticalRouteKeys: REQUIRED_SHELL_ROUTE_KEYS.filter((routeKey) => !routeKeys.has(routeKey)),
			criticalReadsBeforeShellReady: readsBeforeReady.length,
			gauzyRequestsInFirst5s: firstFiveSeconds.length,
			duplicateGetCount,
			richGlobalReadCount: requests.filter((request) => request.richGlobalRead === true).length,
			p95Ms: nearestRank(durations, 0.95),
			maxMs: durations.length ? Math.max(...durations) : null
		};
	});

	return {
		mode: candidate?.mode ?? 'unknown',
		sampleCount: samples.length,
		samples
	};
}

export function compareStartup(
	candidateSummary,
	{ samples = 5, criticalReads = 12, firstFiveSeconds = 20, shellReadyMs = DEFAULT_SHELL_READY_BUDGET_MS, baseline } = {}
) {
	const failures = [];
	if (candidateSummary.sampleCount !== samples) {
		failures.push(`Expected exactly ${samples} cold samples; received ${candidateSummary.sampleCount}.`);
	}
	if (baseline && baseline.transport.count === 0) {
		failures.push('The supplied HAR reference captured no Gauzy requests.');
	}
	for (const sample of candidateSummary.samples) {
		const label = `Sample ${sample.index}`;
		if (sample.requestCount === 0) {
			failures.push(`${label}: captured no Gauzy requests.`);
		}
		if (sample.missingCriticalRouteKeys.length > 0) {
			failures.push(`${label}: missing critical route keys: ${sample.missingCriticalRouteKeys.join(', ')}.`);
		}
		if (!Number.isFinite(sample.shellReadyMs) || sample.shellReadyMs <= 0) {
			failures.push(`${label}: shell-ready timing is missing or invalid.`);
		} else if (sample.shellReadyMs > shellReadyMs) {
			failures.push(
				`${label}: shell-ready ${sample.shellReadyMs.toLocaleString('en-US')} ms exceeds ${shellReadyMs.toLocaleString(
					'en-US'
				)} ms.`
			);
		}
		if (sample.criticalReadsBeforeShellReady > criticalReads) {
			failures.push(
				`${label}: critical reads before shell-ready ${sample.criticalReadsBeforeShellReady} exceed ${criticalReads}.`
			);
		}
		if (sample.gauzyRequestsInFirst5s > firstFiveSeconds) {
			failures.push(
				`${label}: Gauzy requests in the first 5 seconds ${sample.gauzyRequestsInFirst5s} exceed ${firstFiveSeconds}.`
			);
		}
		if (sample.duplicateGetCount > 0) {
			failures.push(`${label}: duplicate normalized GET count is ${sample.duplicateGetCount}.`);
		}
		if (sample.richGlobalReadCount > 0) {
			failures.push(`${label}: rich global time-log/report read count is ${sample.richGlobalReadCount}.`);
		}
	}
	return { passed: failures.length === 0, failures };
}

function parseArgs(argv) {
	const parsed = { apiOrigins: [] };
	for (const argument of argv) {
		const [key, ...valueParts] = argument.replace(/^--/, '').split('=');
		const value = valueParts.join('=');
		if (key === 'api-origin') parsed.apiOrigins.push(value);
		else if (key) parsed[key] = value;
	}
	return parsed;
}

function runCli() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.candidate) {
		throw new Error('Usage: compare-startup.mjs --candidate=<json> [--baseline=<har>] [--out=<json>]');
	}
	const candidate = JSON.parse(readFileSync(resolve(args.candidate), 'utf8'));
	const candidateSummary = summarizeCandidate(candidate);
	let baseline;
	if (args.baseline) {
		const har = JSON.parse(readFileSync(resolve(args.baseline), 'utf8'));
		baseline = summarizeHar(har, { apiOrigins: args.apiOrigins });
	}
	const comparison = compareStartup(candidateSummary, { baseline });
	const report = { candidate: candidateSummary, comparison };
	if (baseline) report.baseline = baseline;
	if (args.out) {
		const out = resolve(args.out);
		mkdirSync(dirname(out), { recursive: true });
		writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
	}
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (!comparison.passed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	try {
		runCli();
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	}
}
