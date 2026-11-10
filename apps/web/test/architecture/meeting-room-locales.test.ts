import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const PLACEHOLDER_PATTERN = /\{\w+\}/g;

// What a meeting room says while it connects and when it cannot open
const MEETING_ROOM_KEYS = [
	'CONNECTING_MEETING_SERVER',
	'MEETING_UNAVAILABLE',
	'MEETING_SERVER_UNREACHABLE',
	'MEETING_SERVER_TIMEOUT',
	'MEETING_SERVER_INVALID',
	'MEETING_SERVER_NOT_CONFIGURED',
	'MEETING_DISCONNECTED',
	'MEETING_DISCONNECTED_HINT',
	'MEETING_LINK_INVALID',
	'TRY_AGAIN',
	'BACK_HOME'
] as const;

type TLocaleMessages = { collaborate: Record<string, string> };

function readMessages(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

function placeholdersOf(message: string) {
	return (message.match(PLACEHOLDER_PATTERN) ?? []).sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const englishMessages = readMessages('en.json');

describe('meeting room translations', () => {
	it.each(localeFiles)('defines every meeting room state in %s with the English placeholders', (file) => {
		const messages = readMessages(file);

		for (const key of MEETING_ROOM_KEYS) {
			const message = messages.collaborate[key];
			expect(message).toBeTruthy();
			expect(placeholdersOf(message)).toEqual(placeholdersOf(englishMessages.collaborate[key]));
		}
	});

	it.each(translatedLocaleFiles)('says why a meeting room cannot open in the language of %s', (file) => {
		const messages = readMessages(file);

		expect(messages.collaborate.MEETING_UNAVAILABLE).not.toBe(englishMessages.collaborate.MEETING_UNAVAILABLE);
		expect(messages.collaborate.MEETING_SERVER_UNREACHABLE).not.toBe(
			englishMessages.collaborate.MEETING_SERVER_UNREACHABLE
		);
	});
});
