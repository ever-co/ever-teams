import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/**
 * The reason a bulk edit of time entries gives for the entries the API refused because they changed after they were
 * read (#5382): every locale states it in its own language, with the count, as the run's other reasons are.
 */
function changedMeanwhileOf(file: string): unknown {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as {
		dashboard?: { timesheets?: { BULK_EDIT?: { REASON?: Record<string, unknown> } } };
	};
	return messages.dashboard?.timesheets?.BULK_EDIT?.REASON?.CHANGED_MEANWHILE;
}

const LOCALE_FILES = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));

/** The plural forms a count takes in each language beyond `other`, as the other bulk edit reasons state them. */
const PLURAL_FORMS: Record<string, string[]> = {
	'ar.json': ['zero', 'one', 'two', 'few', 'many'],
	'he.json': ['one', 'two'],
	'pl.json': ['one', 'few', 'many'],
	'ru.json': ['one', 'few', 'many'],
	'zh.json': []
};
const ENGLISH = changedMeanwhileOf('en.json');

describe('the reason of time entries a bulk edit found changed meanwhile', () => {
	it('is stated in English, with the count', () => {
		expect(ENGLISH).toBe(
			'{count, plural, one {# entry was changed elsewhere while this edit ran, so nothing was saved to it.} ' +
				'other {# entries were changed elsewhere while this edit ran, so nothing was saved to them.}}'
		);
	});

	it.each(LOCALE_FILES.filter((file) => file !== 'en.json'))('is translated in %s, with the count', (file) => {
		const message = changedMeanwhileOf(file);

		expect(typeof message).toBe('string');
		expect(message).not.toBe(ENGLISH);
		expect(message as string).toMatch(/^\{count, plural, .*other \{[^}]*#[^}]*\}\}$/);
	});

	it.each(LOCALE_FILES)('states every plural form %s has', (file) => {
		const message = changedMeanwhileOf(file) as string;
		const forms = PLURAL_FORMS[file] ?? ['one'];
		const stated = [...message.matchAll(/(\w+) \{/g)].map((match) => match[1]);

		expect(stated).toEqual([...forms, 'other']);
	});
});
