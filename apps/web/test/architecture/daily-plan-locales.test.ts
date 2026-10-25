import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const DAILY_PLAN_GROUPS = ['toastMessages', 'labels'] as const;
const PLACEHOLDER_PATTERN = /\{\w+\}/g;

type TLocaleMessages = {
	common: Record<string, string>;
	dailyPlan: Record<(typeof DAILY_PLAN_GROUPS)[number], Record<string, string>>;
};

function readMessages(file: string): TLocaleMessages {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	return JSON.parse(content) as TLocaleMessages;
}

function getPlaceholders(message: string) {
	const placeholders = message.match(PLACEHOLDER_PATTERN);
	if (!placeholders) {
		return [];
	}
	return placeholders.sort();
}

const localesDirectoryFiles = readdirSync(LOCALES_DIRECTORY);
const localeFiles = localesDirectoryFiles.filter((file) => file.endsWith('.json'));
const englishMessages = readMessages('en.json');

describe('daily plan translations', () => {
	it.each(localeFiles)('defines every daily plan toast and label in %s with the English placeholders', (file) => {
		const messages = readMessages(file);

		for (const group of DAILY_PLAN_GROUPS) {
			const englishGroup = englishMessages.dailyPlan[group];
			for (const [key, englishMessage] of Object.entries(englishGroup)) {
				const message = messages.dailyPlan[group][key];
				expect(message).toBeTruthy();
				const placeholders = getPlaceholders(message);
				const englishPlaceholders = getPlaceholders(englishMessage);
				expect(placeholders).toEqual(englishPlaceholders);
			}
		}
	});
});
