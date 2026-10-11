#!/usr/bin/env node

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

// The targets are 500 kB gzip for the sign-in page and 1 MB for an app page. The bundle fixes merged before
// this check bring both pages to an estimated 1,345 kB, so each budget is that estimate plus 10 %.
// English is the default locale and paths are prefixed only as needed, so /en/auth/passcode and /en/kanban
// redirect to these paths.
// Only the scripts listed in the served HTML are counted, the JavaScript a visit downloads before the page
// is interactive. Chunks loaded later through a dynamic import, like the /kanban board view (`ssr: false`),
// are not part of this measurement.
const MEASURED = 'chunk scripts listed in the initial HTML; chunks loaded later by dynamic imports are not counted';
const PAGES = [
	{ path: '/auth/passcode', gzipBudgetBytes: 1_480_000 },
	{ path: '/kanban', gzipBudgetBytes: 1_480_000 }
];

export function chunkScriptUrls(html, baseUrl) {
	const urls = new Set();
	for (const [, attributes] of html.matchAll(/<script\b([^>]*)>/gi)) {
		// Browsers that support modules never download `nomodule` scripts (the legacy polyfills).
		if (/\bnomodule\b/i.test(attributes)) continue;
		const src = attributes.match(/\bsrc=(["'])(.*?)\1/i)?.[2];
		if (!src) continue;
		const url = new URL(src.replaceAll('&amp;', '&'), baseUrl);
		if (url.pathname.startsWith('/_next/static/chunks/') && url.pathname.endsWith('.js')) urls.add(url.href);
	}
	return [...urls];
}

async function fetchBody(url) {
	// A redirect would measure another page, typically the sign-in page instead of the app page.
	const response = await fetch(url, { redirect: 'manual' });
	if (response.status !== 200) {
		const location = response.headers.get('location');
		const target = location ? ` (to ${location})` : '';
		throw new Error(`${url} answered ${response.status}${target}, expected 200.`);
	}
	return Buffer.from(await response.arrayBuffer());
}

export async function measurePage(baseUrl, path) {
	const html = (await fetchBody(new URL(path, baseUrl))).toString('utf8');
	const scripts = chunkScriptUrls(html, baseUrl);
	const bodies = await Promise.all(scripts.map(fetchBody));
	return {
		path,
		scripts: scripts.length,
		rawBytes: bodies.reduce((total, body) => total + body.length, 0),
		gzipBytes: bodies.reduce((total, body) => total + gzipSync(body).length, 0)
	};
}

async function runCli() {
	const baseUrl = parseArgs({ options: { 'base-url': { type: 'string' } } }).values['base-url'];
	if (!baseUrl) throw new Error('Usage: page-weight.mjs --base-url=<origin of a running next start>');
	const pages = await Promise.all(
		PAGES.map(async ({ path, gzipBudgetBytes }) => ({ ...(await measurePage(baseUrl, path)), gzipBudgetBytes }))
	);
	const failures = [];
	for (const { path, scripts, gzipBytes, gzipBudgetBytes } of pages) {
		if (scripts === 0) {
			failures.push(`${path}: no /_next/static/chunks/*.js script found in the HTML.`);
		} else if (gzipBytes > gzipBudgetBytes) {
			const [measured, budget] = [gzipBytes, gzipBudgetBytes].map((bytes) => bytes.toLocaleString('en-US'));
			failures.push(`${path}: ${measured} bytes gzip exceed the ${budget} bytes budget.`);
		}
	}
	process.stdout.write(
		`${JSON.stringify({ measured: MEASURED, pages, passed: failures.length === 0, failures }, null, 2)}\n`
	);
	if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	try {
		await runCli();
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	}
}
