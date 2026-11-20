import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** The words of the workspace's time zone row and of its saves (#5649). */
const TIME_ZONE_KEYS = [
	'TIME_ZONE_LABEL',
	'TIME_ZONE_DESCRIPTION',
	'TIME_ZONE_NOT_SET',
	'TIME_ZONE_SAVED',
	'TIME_ZONE_OUTCOME',
	'TIME_ZONE_CLEARED',
	'TIME_ZONE_CLEARED_OUTCOME',
	'TIME_ZONE_NOT_SAVED'
] as const;

function workspaceWordsOf(file: string): Record<string, string> {
	const messages = JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8'));
	return messages.settings.workspace;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));

describe("the workspace time zone row's words", () => {
	it.each(localeFiles)('are all in %s, and the saved message names the zone', (file) => {
		const words = workspaceWordsOf(file);

		for (const key of TIME_ZONE_KEYS) {
			expect(words[key]?.trim()).toBeTruthy();
		}
		expect(words.TIME_ZONE_SAVED).toContain('{timeZone}');
	});

	it.each(localeFiles.filter((file) => file !== 'en.json'))('are translated in %s', (file) => {
		const english = workspaceWordsOf('en.json');
		const words = workspaceWordsOf(file);

		expect(words.TIME_ZONE_LABEL).not.toBe(english.TIME_ZONE_LABEL);
		expect(words.TIME_ZONE_DESCRIPTION).not.toBe(english.TIME_ZONE_DESCRIPTION);
	});
});
