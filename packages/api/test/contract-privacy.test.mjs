// The recorded answers hold no real data: node --test test/*.test.mjs (from packages/api, after `rollup -c`). Every
// text is a placeholder, a value the API picks from a list, or empty. After a recording on this machine, the real
// values it replaced (listed outside the repository) are also looked for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORBIDDEN_FILE } from '../scripts/record-contract.mjs';
import { CONTRACT_ANSWERS } from '../scripts/contract/answers.mjs';
import { KEPT_KEYS } from '../scripts/contract/redact.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const contractDir = path.join(here, 'contract');

const fixtures = CONTRACT_ANSWERS.map((answer) => {
	const text = fs.readFileSync(path.join(contractDir, `${answer.name}.json`), 'utf8');
	return { name: answer.name, text, ...JSON.parse(text) };
});

const PLACEHOLDERS = [
	/^<[\w-]+-\d+>$/,
	/^<jwt>$/,
	/^person-\d+@example\.com$/,
	/^https:\/\/example\.com\/\w+-\d+$/,
	/^2000-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
	/^2000-\d{2}-\d{2}$/,
	/^$/
];

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Every text of an answer, with the key it is under.
function textsOf(value, key, found = []) {
	if (Array.isArray(value)) {
		value.forEach((item) => textsOf(item, key, found));
		return found;
	}
	if (typeof value === 'object' && value !== null) {
		Object.entries(value).forEach(([childKey, child]) => textsOf(child, childKey, found));
		return found;
	}
	if (typeof value === 'string') {
		found.push({ key, value });
	}
	return found;
}

const isPlaceholder = (value) => PLACEHOLDERS.some((pattern) => pattern.test(value));

test('every answer the contract covers has its fixture', () => {
	assert.deepEqual(
		fixtures.map((fixture) => fixture.name),
		CONTRACT_ANSWERS.map((answer) => answer.name)
	);
});

for (const fixture of fixtures) {
	test(`${fixture.name}: every text is a placeholder or a value the API picks from a list`, () => {
		const personal = textsOf(fixture.answer).filter(
			({ key, value }) => !KEPT_KEYS.has(key) && !isPlaceholder(value)
		);

		assert.deepEqual(personal, []);
	});

	test(`${fixture.name}: no email address but example.com, no token, no id`, () => {
		const emails = fixture.text.match(EMAIL) ?? [];

		assert.deepEqual(
			emails.filter((email) => !email.endsWith('@example.com')),
			[]
		);
		assert.doesNotMatch(fixture.text, JWT);
		assert.doesNotMatch(fixture.text, UUID);
		assert.match(fixture.route, /^(GET|POST) \/[\w/<>.-]+$/);
	});
}

const forbiddenFile = process.env.EVER_TEAMS_CONTRACT_FORBIDDEN ?? FORBIDDEN_FILE;
// Listed only on the machine that recorded: elsewhere the test is skipped.
const recordedHere = fs.existsSync(forbiddenFile);

test('none of the real values the last recording replaced is in a fixture', { skip: !recordedHere }, () => {
	// Shorter values (a two-letter code) would be found inside unrelated text.
	const forbidden = JSON.parse(fs.readFileSync(forbiddenFile, 'utf8')).filter((value) => value.length >= 4);
	const texts = fixtures.flatMap((fixture) => [fixture.route, ...textsOf(fixture.answer).map(({ value }) => value)]);

	const leaked = forbidden.filter((value) => texts.some((text) => text.includes(value)));

	assert.ok(forbidden.length > 0);
	assert.deepEqual(leaked, []);
});
