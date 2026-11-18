// The recorded answers hold no real data: node --test test/*.test.mjs (from packages/api, after `rollup -c`). Every
// text is a placeholder, a value the API picks from a list, or empty. After a recording on this machine, the real
// values it replaced are also looked for: set EVER_TEAMS_CONTRACT_FORBIDDEN to the file the recorder printed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_ANSWERS, contractAnswer } from '../scripts/contract/answers.mjs';
import { KEPT_KEYS, redactRecordings } from '../scripts/contract/redact.mjs';

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
	// The redactor's dates count from 2000-01-01, a minute or a day apart: past 366 distinct days they reach 2001.
	/^200\d-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
	/^200\d-\d{2}-\d{2}$/,
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
		assert.deepEqual(unredactedRouteParts(fixture), []);
	});
}

// The segments of a route that came from the data and are not an id placeholder (<employee-1>).
function unredactedRouteParts(fixture) {
	return routeDataOf(fixture).filter((segment) => !/^<[\w-]+-\d+>$/.test(segment));
}

test('a route parameter that is not an id placeholder is found, and the fixed words of a route are not', () => {
	const projects = { name: 'projects.list', route: 'GET /organization-projects/employee/lina-okafor' };
	const me = { name: 'user.me', route: 'GET /user/me' };
	const tasks = { name: 'tasks.list', route: 'GET /tasks/employee/<employee-1>' };

	assert.deepEqual(unredactedRouteParts(projects), ['lina-okafor']);
	assert.deepEqual(unredactedRouteParts(me), []);
	assert.deepEqual(unredactedRouteParts(tasks), []);
});

test('the dates of a recording that spans more than 366 days pass as placeholders, past 2000 too', () => {
	const day = (offset) => new Date(Date.UTC(2025, 0, 1) + offset * 24 * 3600 * 1000).toISOString().slice(0, 10);
	const entries = Array.from({ length: 367 }, (_, offset) => ({ startedWorkOn: day(offset) }));
	const { fixtures: redacted } = redactRecordings([
		{ name: 'members.list', route: 'GET /employee/working', status: 200, answer: entries, idKind: 'employee' }
	]);

	const texts = textsOf(redacted[0].answer).map(({ value }) => value);
	assert.equal(texts.at(-1), '2001-01-01');
	assert.deepEqual(
		texts.filter((value) => !isPlaceholder(value)),
		[]
	);
});

// The segments of a route that came from the data: those the contract's route names with a parameter
// (/tasks/employee/:employeeId), never its fixed words (/user/me).
function routeDataOf(fixture) {
	const template = contractAnswer(fixture.name).route.split('/');
	return fixture.route.split('/').filter((segment, index) => template[index]?.startsWith(':'));
}

// The real values of `forbidden` still found in the fixtures. A placeholder holds no real value, nor does a fixed word
// of a route: a person whose first name is "user" is found neither in "<user-1>" nor in "GET /user/me". Shorter
// values (a two-letter code) would be found inside unrelated text.
function leakedOf(forbidden, fixtureList) {
	const texts = fixtureList.flatMap((fixture) => {
		const answerTexts = textsOf(fixture.answer).map(({ value }) => value);
		return [...routeDataOf(fixture), ...answerTexts].filter((text) => !isPlaceholder(text));
	});
	const findable = forbidden.filter((value) => value.length >= 4);
	return findable.filter((value) => texts.some((text) => text.includes(value)));
}

test('the leak check finds a real value left in a text or a route, never one inside a placeholder or a fixed word', () => {
	const fixtureList = [
		{
			name: 'tasks.list',
			route: 'GET /tasks/employee/<employee-1>',
			answer: [{ id: '<task-1>', createdByUserId: '<user-2>', title: '<title-1>' }]
		},
		{ name: 'projects.list', route: 'GET /organization-projects/employee/lina-okafor', answer: [] },
		{ name: 'user.me', route: 'GET /user/me', answer: { lastName: 'Okafor', note: 'ask Lina first' } }
	];
	const forbidden = ['user', 'employee', 'task', 'Okafor', 'Lina', 'lina-okafor', 'Sam Lee'];

	assert.deepEqual(leakedOf(forbidden, fixtureList), ['Okafor', 'Lina', 'lina-okafor']);
});

// Listed only after a recording on this machine, in the file the recorder printed: elsewhere the test is skipped.
const forbiddenFile = process.env.EVER_TEAMS_CONTRACT_FORBIDDEN;
const recordedHere = Boolean(forbiddenFile);

test('none of the real values the last recording replaced is in a fixture', { skip: !recordedHere }, () => {
	const forbidden = JSON.parse(fs.readFileSync(forbiddenFile, 'utf8'));

	assert.ok(forbidden.length > 0);
	assert.deepEqual(leakedOf(forbidden, fixtures), []);
});
