import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** The strings of the Data section of the workspace settings (#5208). */
const EXPORT_KEYS = [
	'DATA_SECTION',
	'EXPORT_LABEL',
	'EXPORT_DESCRIPTION',
	'EXPORT_ACTION',
	'EXPORTING',
	'EXPORT_DONE',
	'EXPORT_FAILED',
	'EXPORT_FAILED_DESCRIPTION'
] as const;

/** Words that read the same in several languages, so a translation may keep them. */
const SAME_IN_SOME_LANGUAGES = new Set(['DATA_SECTION', 'EXPORT_ACTION']);

type TLocaleMessages = { settings: { workspace: Record<string, string> } };

function workspaceMessagesOf(file: string): Record<string, string> {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.settings.workspace;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = workspaceMessagesOf('en.json');

describe("translations of the export of the workspace's data", () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says everything the Data section shows in %s', (file) => {
		const messages = workspaceMessagesOf(file);

		for (const key of EXPORT_KEYS) {
			expect(messages[key]?.trim()).toBeTruthy();
		}
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = workspaceMessagesOf(file);
		const translatedKeys = EXPORT_KEYS.filter((key) => !SAME_IN_SOME_LANGUAGES.has(key));

		for (const key of translatedKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});

	it.each(localeFiles)('names the archive and its CSV files in %s', (file) => {
		const description = workspaceMessagesOf(file).EXPORT_DESCRIPTION;

		expect(description).toContain('ZIP');
		expect(description).toContain('CSV');
	});
});
