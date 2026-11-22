import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TLocaleMessages = {
	common: Record<string, string>;
	dashboard: { calendar: Record<string, string> };
};

function readMessages(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readMessages('en.json');

// What the home says to an account with no member profile, in place of a team that never loads (#5678)
describe('no member profile translations', () => {
	it('covers the thirteen locales of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says what is missing in %s', (file) => {
		const messages = readMessages(file);
		expect(messages.dashboard.calendar.NO_MEMBER_TITLE).toBeTruthy();
		expect(messages.common.NO_MEMBER_PROFILE_MESSAGE).toBeTruthy();
	});

	// An admin cannot add such an account to a team from the app today, and a second invitation of the same address
	// creates a second account (ever-co/ever-gauzy#12143): the message states the fact and sends nobody anywhere
	it.each(localeFiles)('states one fact and gives no advice in %s', (file) => {
		const message = readMessages(file).common.NO_MEMBER_PROFILE_MESSAGE;
		const sentenceEnds = message.match(/[.。](\s|$)/g) ?? [];
		expect(sentenceEnds).toHaveLength(1);
	});

	it('does not send the person to an admin', () => {
		expect(english.common.NO_MEMBER_PROFILE_MESSAGE).not.toMatch(/admin/i);
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		expect(readMessages(file).common.NO_MEMBER_PROFILE_MESSAGE).not.toBe(english.common.NO_MEMBER_PROFILE_MESSAGE);
	});
});
