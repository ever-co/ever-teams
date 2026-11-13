import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	JIRA_CALLBACK_ERRORS,
	JIRA_DIRECTIONS,
	JIRA_STATUS_CATEGORIES
} from '@/core/types/interfaces/integrations/jira';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const PROVIDER_SOURCE = resolve(__dirname, '../../core/components/settings/pages/integrations/jira-provider.tsx');
/** ICU arguments: `{name}` and the counted argument of a plural, `{count, plural, ...}`. */
const ARGUMENT_PATTERN = /\{(\w+)[,}]/g;

type TLocaleMessages = { settings: { integrations: { jira: Record<string, string> } } };

function jiraMessagesOf(file: string): Record<string, string> {
	return (JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages).settings.integrations
		.jira;
}

function argumentsOf(message: string) {
	return [...message.matchAll(ARGUMENT_PATTERN)].map((match) => match[1]).sort();
}

/**
 * Every key the Jira section asks for: the literal ones in its source (`${KEYS}.NAME`), and the families it builds
 * from a value (a status category, a direction, a run's kind and status, a callback error).
 */
function keysTheProviderUses(): string[] {
	const source = readFileSync(PROVIDER_SOURCE, 'utf8');
	const literal = [...source.matchAll(/\$\{KEYS\}\.([A-Z][A-Za-z_]*[A-Za-z])\b/g)].map((match) => match[1]);
	return [
		...literal,
		...JIRA_STATUS_CATEGORIES.map((category) => `CATEGORY_${category}`),
		...JIRA_DIRECTIONS.map((direction) => `DIRECTION_${direction}`),
		...['import', 'webhook'].map((kind) => `RUN_${kind}`),
		...['running', 'done', 'failed'].map((status) => `RUN_STATUS_${status}`),
		...JIRA_CALLBACK_ERRORS.map((error) => `CALLBACK_${error}`)
	];
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const englishJira = jiraMessagesOf('en.json');

describe('Jira integration translations', () => {
	it('defines in English every key the Jira section asks for', () => {
		const missing = [...new Set(keysTheProviderUses())].filter((key) => !englishJira[key]);
		expect(missing).toEqual([]);
	});

	it.each(localeFiles)('defines every Jira message in %s with the English arguments', (file) => {
		const jira = jiraMessagesOf(file);

		expect(Object.keys(jira).sort()).toEqual(Object.keys(englishJira).sort());
		for (const [key, english] of Object.entries(englishJira)) {
			expect(jira[key]).toBeTruthy();
			expect(argumentsOf(jira[key])).toEqual(argumentsOf(english));
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s for the Jira-only messages', (file) => {
		const jira = jiraMessagesOf(file);

		for (const key of [
			'SITE_REQUIRED',
			'STATUS_MAP_HINT',
			'ISSUE_TYPES_HINT',
			'WEBHOOK_MISSING',
			'CALLBACK_no_site'
		]) {
			expect(jira[key]).not.toBe(englishJira[key]);
		}
	});
});
