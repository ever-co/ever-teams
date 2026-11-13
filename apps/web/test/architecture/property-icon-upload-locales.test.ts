import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const PLACEHOLDER_PATTERN = /\{\w+\}/g;

// What the icon picker says about an uploaded image (#5024)
const ICON_UPLOAD_KEYS = [
	'ICON_SOURCE',
	'ICON_TAB_LIBRARY',
	'ICON_TAB_UPLOAD',
	'ICON_UPLOAD_CHOOSE',
	'ICON_UPLOAD_REPLACE',
	'ICON_UPLOAD_HINT',
	'ICON_UPLOADING',
	'ICON_UPLOADING_PROGRESS',
	'ICON_UPLOAD_TYPE_ERROR',
	'ICON_UPLOAD_SIZE_ERROR',
	'ICON_UPLOAD_FAILED',
	'ICON_UPLOADED_NAME'
] as const;

type TLocaleMessages = { settings: { taskProperties: Record<string, string> } };

function readMessages(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

function placeholdersOf(message: string) {
	return (message.match(PLACEHOLDER_PATTERN) ?? []).sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readMessages('en.json').settings.taskProperties;

describe('icon upload translations', () => {
	it('covers the thirteen locales of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says everything the icon upload shows in %s, with the English placeholders', (file) => {
		const messages = readMessages(file).settings.taskProperties;

		for (const key of ICON_UPLOAD_KEYS) {
			const message = messages[key];
			expect(message).toBeTruthy();
			expect(placeholdersOf(message)).toEqual(placeholdersOf(english[key]));
		}
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = readMessages(file).settings.taskProperties;

		expect(messages.ICON_UPLOAD_CHOOSE).not.toBe(english.ICON_UPLOAD_CHOOSE);
		expect(messages.ICON_UPLOAD_HINT).not.toBe(english.ICON_UPLOAD_HINT);
		expect(messages.ICON_UPLOAD_FAILED).not.toBe(english.ICON_UPLOAD_FAILED);
	});
});
