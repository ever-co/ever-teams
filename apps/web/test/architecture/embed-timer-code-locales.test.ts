import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The strings of the timer code Settings > Embeds gives for a site whose people sign in with their own account (#5577),
 * in the 13 languages of the app, with the package and the path the code needs named as they are.
 */
const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

const APP_LOCALE_FILES = ['ar', 'bg', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'].map(
	(language) => `${language}.json`
);

const TIMER_CODE_KEYS = [
	'TIMER_CODE_TITLE',
	'TIMER_CODE_TEXT',
	'TIMER_CODE_COPY',
	'TIMER_CODE_COPIED',
	'TIMER_CODE_NOT_COPIED'
] as const;

type TLocaleMessages = { settings: { embeds: Record<string, string> } };

function embedsMessagesOf(file: string): Record<string, string> {
	const messages = JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
	return messages.settings.embeds;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const english = embedsMessagesOf('en.json');

describe('translations of the timer code for a site', () => {
	it('covers the 13 languages of the app', () => {
		expect([...localeFiles].sort()).toEqual(APP_LOCALE_FILES);
	});

	it.each(localeFiles)('says everything the section shows in %s, with the package and the path in place', (file) => {
		const embeds = embedsMessagesOf(file);

		for (const key of TIMER_CODE_KEYS) {
			expect(embeds[key]?.trim()).toBeTruthy();
		}
		expect(embeds.TIMER_CODE_TEXT).toContain('@ever-teams/embed');
		expect(embeds.TIMER_CODE_TEXT).toContain('/ever-teams/');
	});

	it.each(localeFiles.filter((file) => file !== 'en.json'))('is translated in %s', (file) => {
		const embeds = embedsMessagesOf(file);

		for (const key of TIMER_CODE_KEYS) {
			expect(embeds[key]).not.toBe(english[key]);
		}
	});
});
