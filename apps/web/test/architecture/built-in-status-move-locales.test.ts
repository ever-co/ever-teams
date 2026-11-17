import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TLocaleMessages = { settings: { taskProperties: Record<string, string> } };

function readMessages(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readMessages('en.json').settings.taskProperties;

// What the menu of a built-in status says in place of its moves: Gauzy never writes a built-in status's order (#5359)
describe('built-in status move translations', () => {
	it('covers the thirteen locales of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says a built-in status cannot be moved in %s', (file) => {
		expect(readMessages(file).settings.taskProperties.BUILT_IN_MOVE).toBeTruthy();
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		expect(readMessages(file).settings.taskProperties.BUILT_IN_MOVE).not.toBe(english.BUILT_IN_MOVE);
	});
});
