import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** The top bar's theme button (spec A4 of the shared Ever shell) names the theme it switches to. */
const THEME_BUTTON_KEYS = ['SWITCH_TO_DARK_THEME', 'SWITCH_TO_LIGHT_THEME'] as const;

/** The account menu's first rows (spec A6) reuse the Settings names, so they must exist in every locale. */
const ACCOUNT_MENU_PATHS = [
	['settings', 'groups', 'account'],
	['settings', 'entries', 'preferences', 'TITLE']
] as const;

type Messages = { [key: string]: string | Messages };

function read(file: string): Messages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as Messages;
}

function valueAt(messages: Messages, path: ReadonlyArray<string>) {
	let node: string | Messages | undefined = messages;
	for (const part of path) {
		if (node === undefined || typeof node === 'string') {
			return undefined;
		}
		node = node[part];
	}
	return typeof node === 'string' ? node : undefined;
}

const english = read('en.json');
const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));

describe('the shell strings of the top bar and the account menu', () => {
	it.each(localeFiles)('%s names both themes of the top bar button and the account menu rows', (file) => {
		const messages = read(file);
		for (const key of THEME_BUTTON_KEYS) {
			const value = valueAt(messages, ['common', key]);
			expect({ key, present: typeof value === 'string' && value.trim() !== '' }).toEqual({ key, present: true });
			if (file !== 'en.json') {
				expect({ key, value }).not.toEqual({ key, value: valueAt(english, ['common', key]) });
			}
		}
		for (const path of ACCOUNT_MENU_PATHS) {
			expect({ path, present: typeof valueAt(messages, path) === 'string' }).toEqual({ path, present: true });
		}
	});
});
