import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** Words the reader's language has for the page, where English must not be left in place. */
const TRANSLATED_KEYS = ['TITLE', 'TRACKED_THIS_WEEK', 'NO_LIMIT', 'RECENT_TITLE', 'EMPTY_THIS_WEEK', 'OPEN_TIMER'];

type MyWeekMessages = Record<string, string>;

function readMyWeek(file: string): MyWeekMessages {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	const messages = JSON.parse(content) as { dashboard: { myWeek: MyWeekMessages } };
	return messages.dashboard.myWeek;
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
		const rest = message.slice(index + 1);
		const name = /^\w+/.exec(rest);
		if (name) {
			names.push(name[0]);
		}
	}
	return names.sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readMyWeek('en.json');

describe('My week translations', () => {
	it.each(localeFiles)('defines every My week message in %s with the English arguments', (file) => {
		const messages = readMyWeek(file);

		expect(Object.keys(messages)).toEqual(Object.keys(english));
		for (const [key, englishMessage] of Object.entries(english)) {
			expect(messages[key]).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(englishMessage));
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s on the My week page', (file) => {
		const messages = readMyWeek(file);

		for (const key of TRANSLATED_KEYS) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});

	it('counts the entries with a plural in every language', () => {
		for (const file of localeFiles) {
			expect(readMyWeek(file).RECENT_LATEST).toMatch(/\{total, plural, /);
		}
	});
});
