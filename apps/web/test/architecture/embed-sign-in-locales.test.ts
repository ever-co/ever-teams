import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The strings of a person's sign-in from an allowed site (#5528): the page where the person allows the site
 * (`pages.embedAuthorize`) and the switch of each site in Settings > Embeds, in the 13 languages of the app.
 */
const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

const APP_LOCALE_FILES = ['ar', 'bg', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'].map(
	(language) => `${language}.json`
);

const SWITCH_KEYS = ['PERSON_SIGN_IN', 'PERSON_SIGN_IN_FAILED'] as const;

/** "Site" is also the French, Dutch and Portuguese word. */
const SAME_IN_SOME_LANGUAGES = new Set<string>(['SITE_LABEL']);

type TLocaleMessages = {
	pages: { embedAuthorize: Record<string, string> };
	settings: { embeds: Record<string, string> };
};

function messagesOf(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = messagesOf('en.json');
const PAGE_KEYS = Object.keys(english.pages.embedAuthorize);

describe('translations of the sign-in from an allowed site', () => {
	it('covers the 13 languages of the app', () => {
		expect([...localeFiles].sort()).toEqual(APP_LOCALE_FILES);
	});

	it.each(localeFiles)('says everything the page and the switch show in %s, with their names in place', (file) => {
		const messages = messagesOf(file);
		const page = messages.pages.embedAuthorize;

		expect(Object.keys(page)).toEqual(PAGE_KEYS);
		for (const key of PAGE_KEYS) {
			expect(page[key]?.trim()).toBeTruthy();
		}
		for (const key of SWITCH_KEYS) {
			expect(messages.settings.embeds[key]?.trim()).toBeTruthy();
		}
		expect(page.DESCRIPTION).toContain('{appName}');
		expect(page.SIGN_IN_TEXT).toContain('{appName}');
		expect(page.SIGN_IN_TEXT).toContain('{site}');
	});

	it.each(translatedLocaleFiles)('is translated in %s', (file) => {
		const messages = messagesOf(file);

		for (const key of PAGE_KEYS) {
			if (SAME_IN_SOME_LANGUAGES.has(key)) {
				continue;
			}
			expect(messages.pages.embedAuthorize[key]).not.toBe(english.pages.embedAuthorize[key]);
		}
		for (const key of SWITCH_KEYS) {
			expect(messages.settings.embeds[key]).not.toBe(english.settings.embeds[key]);
		}
	});
});
