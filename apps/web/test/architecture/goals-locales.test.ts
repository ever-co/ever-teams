import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** Words the reader's language has for the Goals page, where English must not be left in place. */
const TRANSLATED_KEYS = [
	'TITLE',
	'NEW_GOAL',
	'YOUR_GOALS',
	'EMPTY_TITLE',
	'state.ACHIEVED',
	'rule.AT_LEAST_WEEK',
	'form.CREATE'
];

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ''): Record<string, string> {
	const flat: Record<string, string> = {};
	for (const [key, value] of Object.entries(messages)) {
		if (typeof value === 'string') {
			flat[`${prefix}${key}`] = value;
			continue;
		}
		Object.assign(flat, flatten(value, `${prefix}${key}.`));
	}
	return flat;
}

function readGoals(file: string): Record<string, string> {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as { dashboard: { goals: Messages } };
	return flatten(messages.dashboard.goals);
}

/** The ICU arguments of a message: what stands right after a brace opened outside any plural branch. */
function argumentsOf(message: string) {
	const names: string[] = [];
	let depth = 0;
	for (let index = 0; index < message.length; index += 1) {
		const character = message[index];
		if (character === '}') {
			depth -= 1;
			continue;
		}
		if (character !== '{') {
			continue;
		}
		const isArgument = depth === 0;
		depth += 1;
		if (!isArgument) {
			continue;
		}
		const name = /^\w+/.exec(message.slice(index + 1));
		if (name) {
			names.push(name[0]);
		}
	}
	return names.sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readGoals('en.json');

describe('Goals translations', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('defines every Goals message in %s with the English arguments', (file) => {
		const messages = readGoals(file);

		expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
		for (const [key, englishMessage] of Object.entries(english)) {
			expect(messages[key]).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(englishMessage));
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s on the Goals page', (file) => {
		const messages = readGoals(file);

		for (const key of TRANSLATED_KEYS) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});

	it('counts the goals with a plural in every language', () => {
		for (const file of localeFiles) {
			expect(readGoals(file).GOAL_COUNT).toMatch(/\{count, plural, /);
		}
	});
});
