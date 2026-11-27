import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** The App Launcher's strings (spec A3 of the shared Ever shell): the panel, and Manage apps in Preferences. */
const LAUNCHER_KEYS = [
	'switchers.APP_LAUNCHER',
	'switchers.PINNED',
	'switchers.YOUR_APPS',
	'switchers.CHIP_CURRENT',
	'switchers.CHIP_BETA',
	'switchers.CHIP_SOON',
	'switchers.LAUNCHER_FOOTER',
	'switchers.MANAGE_APPS',
	'switchers.APP_COMING_SOON',
	'switchers.APP_LINE_PLATFORM',
	'switchers.APP_LINE_WORKS',
	'switchers.APP_LINE_TEAMS',
	'switchers.APP_LINE_GAUZY',
	'switchers.APP_LINE_REC',
	'switchers.APP_LINE_TRADUORA',
	'switchers.APP_LINE_DEMAND',
	'switchers.APP_LINE_TECH',
	'switchers.ADD_APP',
	'switchers.ADD_APPS_IN_PLATFORM',
	'settings.preferences.SECTION_APP_SWITCHER',
	'settings.preferences.SECTION_MANAGE_APPS',
	'settings.preferences.SECTION_MANAGE_APPS_DESCRIPTION',
	'settings.preferences.MANAGE_APPS_PIN_COUNT',
	'settings.preferences.MANAGE_APPS_SAVED',
	'settings.preferences.MANAGE_APPS_COLUMN_SHOW',
	'settings.preferences.MANAGE_APPS_COLUMN_PIN',
	'settings.preferences.MANAGE_APPS_SHOW',
	'settings.preferences.MANAGE_APPS_PIN',
	'settings.preferences.MANAGE_APPS_PIN_LIMIT',
	'settings.preferences.MANAGE_APPS_CURRENT',
	'settings.preferences.MANAGE_APPS_MOVE_UP',
	'settings.preferences.MANAGE_APPS_MOVE_DOWN',
	'settings.preferences.MANAGE_APPS_REORDER',
	'settings.preferences.MANAGE_APPS_MOVED',
	'settings.preferences.MANAGE_APPS_REORDER_HINT',
	'settings.preferences.MANAGE_APPS_REMOVE',
	'settings.preferences.ADD_APP_TITLE',
	'settings.preferences.ADD_APP_DESCRIPTION',
	'settings.preferences.ADD_APP_NAME',
	'settings.preferences.ADD_APP_URL',
	'settings.preferences.ADD_APP_SUBMIT',
	'settings.preferences.ADD_APP_NAME_REQUIRED',
	'settings.preferences.ADD_APP_URL_INVALID',
	'settings.preferences.ADD_APP_LIMIT'
];

/** Words a reader's language has: English must not be left in place (short words like "Beta" or "Name" may match). */
const TRANSLATED_KEYS = [
	'switchers.APP_LAUNCHER',
	'switchers.YOUR_APPS',
	'switchers.CHIP_CURRENT',
	'switchers.LAUNCHER_FOOTER',
	'switchers.MANAGE_APPS',
	'switchers.APP_LINE_PLATFORM',
	'switchers.APP_LINE_WORKS',
	'switchers.APP_LINE_TEAMS',
	'switchers.APP_LINE_GAUZY',
	'switchers.APP_LINE_REC',
	'switchers.APP_LINE_TRADUORA',
	'switchers.APP_LINE_DEMAND',
	'switchers.APP_LINE_TECH',
	'switchers.ADD_APP',
	'switchers.ADD_APPS_IN_PLATFORM',
	'settings.preferences.SECTION_MANAGE_APPS_DESCRIPTION',
	'settings.preferences.MANAGE_APPS_PIN_LIMIT',
	'settings.preferences.MANAGE_APPS_REORDER_HINT',
	'settings.preferences.ADD_APP_TITLE',
	'settings.preferences.ADD_APP_URL_INVALID'
];

type Messages = { [key: string]: string | Messages };

function valueAt(messages: Messages, path: string): string | undefined {
	let node: string | Messages | undefined = messages;
	for (const part of path.split('.')) {
		if (node === undefined || typeof node === 'string') {
			return undefined;
		}
		node = node[part];
	}
	if (typeof node === 'string') {
		return node;
	}
	return undefined;
}

/** The ICU arguments of a message, sorted: `{name}` and `{position}` must survive every translation. */
function argumentsOf(message: string) {
	return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function read(file: string): Messages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as Messages;
}

const english = read('en.json');
const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));

describe('the App Launcher strings', () => {
	it.each(localeFiles)('%s has every string, with the arguments of the English one', (file) => {
		const messages = read(file);
		for (const key of LAUNCHER_KEYS) {
			const value = valueAt(messages, key);
			const englishValue = valueAt(english, key) ?? '';
			expect({ key, present: typeof value === 'string' && value.trim() !== '' }).toEqual({ key, present: true });
			expect({ key, arguments: argumentsOf(value ?? '') }).toEqual({ key, arguments: argumentsOf(englishValue) });
		}
	});

	it.each(localeFiles.filter((file) => file !== 'en.json'))('%s says them in its own language', (file) => {
		const messages = read(file);
		for (const key of TRANSLATED_KEYS) {
			expect({ key, value: valueAt(messages, key) }).not.toEqual({ key, value: valueAt(english, key) });
		}
	});

	it.each(localeFiles)('%s has no "opens in a new tab" string left: every app opens in the same tab', (file) => {
		const switchers = read(file).switchers as Messages;

		expect(switchers.OPENS_IN_NEW_TAB).toBeUndefined();
		expect(switchers.APP_OPENS_IN_NEW_TAB).toBeUndefined();
	});

	it('says nothing about a new tab in the footer', () => {
		expect(valueAt(english, 'switchers.LAUNCHER_FOOTER')).toBe('You may need to sign in');
		expect(JSON.stringify(english.switchers)).not.toMatch(/new tab/i);
	});

	it('calls it the App Launcher, never the app switcher', () => {
		expect(valueAt(english, 'switchers.APP_LAUNCHER')).toBe('App Launcher');
		expect(valueAt(english, 'settings.preferences.SECTION_APP_SWITCHER')).toBe('App Launcher');
		expect(JSON.stringify(english)).not.toMatch(/app switcher/i);
	});
});
