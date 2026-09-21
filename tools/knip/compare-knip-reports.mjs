#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const POSITION_KEYS = new Set(['line', 'col', 'pos']);

function normalizePath(value) {
	return String(value ?? '')
		.replaceAll('\\', '/')
		.replace(/^\.\//, '')
		.replace(/^apps\/web\//, '');
}

function stableValue(value) {
	if (Array.isArray(value)) {
		return value.map(stableValue);
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([key]) => !POSITION_KEYS.has(key))
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, nestedValue]) => [key, stableValue(nestedValue)])
		);
	}

	return value;
}

function findingName(finding) {
	if (typeof finding === 'string') {
		return finding;
	}

	if (finding && typeof finding.name === 'string') {
		return finding.name;
	}

	return JSON.stringify(stableValue(finding));
}

function collectFindings(report) {
	const findings = [];

	for (const issue of report?.issues ?? []) {
		const file = normalizePath(issue.file);

		for (const [category, values] of Object.entries(issue)) {
			if (category === 'file' || category === 'enumMembers' || !Array.isArray(values)) {
				continue;
			}

			for (const value of values) {
				const name = findingName(value);
				findings.push({
					file,
					key: `${category}\u0000${file}\u0000${name}`,
					display: `${category}: ${file} -> ${name}`
				});
			}
		}

		for (const [enumName, members] of Object.entries(issue.enumMembers ?? {})) {
			for (const member of members ?? []) {
				const memberName = findingName(member);
				findings.push({
					file,
					key: `enumMembers\u0000${file}\u0000${enumName}\u0000${memberName}`,
					display: `enumMembers: ${file} -> ${enumName}.${memberName}`
				});
			}
		}
	}

	for (const unusedFile of report?.files ?? []) {
		const file = normalizePath(unusedFile);
		findings.push({ file, key: `file\u0000${file}`, display: `file: ${file}` });
	}

	return findings;
}

export function compareKnipReports(baseReport, headReport, changedFiles) {
	const changed = new Set(changedFiles.map(normalizePath).filter(Boolean));
	const baseKeys = new Set(collectFindings(baseReport).map(({ key }) => key));
	const seen = new Set();
	const added = [];

	for (const finding of collectFindings(headReport)) {
		if (changed.has(finding.file) && !baseKeys.has(finding.key) && !seen.has(finding.key)) {
			seen.add(finding.key);
			added.push(finding.display);
		}
	}

	return added;
}

function argument(name) {
	const prefix = `--${name}=`;
	return process.argv
		.slice(2)
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

async function main() {
	const basePath = argument('base');
	const headPath = argument('head');
	const changedPath = argument('changed');

	if (!basePath || !headPath || !changedPath) {
		throw new Error('Usage: compare-knip-reports.mjs --base=<report> --head=<report> --changed=<file-list>');
	}

	const [baseReport, headReport, changedText] = await Promise.all([
		readFile(basePath, 'utf8').then(JSON.parse),
		readFile(headPath, 'utf8').then(JSON.parse),
		readFile(changedPath, 'utf8')
	]);
	const added = compareKnipReports(baseReport, headReport, changedText.split(/\r?\n/));

	if (added.length === 0) {
		console.log('No new Knip findings in changed web files.');
		return;
	}

	console.error('New Knip findings in changed web files:');
	for (const finding of added) {
		console.error(`- ${finding}`);
	}
	process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
