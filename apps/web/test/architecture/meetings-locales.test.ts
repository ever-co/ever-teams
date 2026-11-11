import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
/** ICU arguments: `{name}` and the counted argument of a plural, `{count, plural, ...}`. */
const ARGUMENT_PATTERN = /\{(\w+)[,}]/g;

type TLocaleMessages = { meetings: Record<string, string> };

function readMessages(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

function argumentsOf(message: string) {
	return [...message.matchAll(ARGUMENT_PATTERN)].map((match) => match[1]).sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const englishMeetings = readMessages('en.json').meetings;

describe('meetings translations', () => {
	it.each(localeFiles)('defines every meetings message in %s with the English arguments', (file) => {
		const { meetings } = readMessages(file);

		expect(Object.keys(meetings).sort()).toEqual(Object.keys(englishMeetings).sort());
		for (const [key, english] of Object.entries(englishMeetings)) {
			expect(meetings[key]).toBeTruthy();
			expect(argumentsOf(meetings[key])).toEqual(argumentsOf(english));
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s on the meetings home and before joining', (file) => {
		const { meetings } = readMessages(file);

		for (const key of ['NEW_MEETING', 'SCHEDULE_TITLE', 'READY_TO_JOIN', 'YOU_LEFT', 'DEVICES_BLOCKED']) {
			expect(meetings[key]).not.toBe(englishMeetings[key]);
		}
	});
});
