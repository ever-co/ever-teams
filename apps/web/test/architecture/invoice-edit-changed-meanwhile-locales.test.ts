import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/**
 * The message of an invoice edit the API refused because the invoice changed after it was read (#5243): every locale
 * states it in its own language, as the edit's other refusals are.
 */
function changedMeanwhileOf(file: string): unknown {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as { invoices?: { edit?: { confirm?: Record<string, unknown> } } };
	return messages.invoices?.edit?.confirm?.CHANGED_MEANWHILE;
}

const LOCALE_FILES = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const ENGLISH = changedMeanwhileOf('en.json');

describe('the message of an invoice edit refused as changed meanwhile', () => {
	it('is stated in English', () => {
		expect(ENGLISH).toBe(
			'This invoice changed since you opened it, so nothing was saved. Close this to see its current version.'
		);
	});

	it.each(LOCALE_FILES.filter((file) => file !== 'en.json'))('is translated in %s', (file) => {
		const message = changedMeanwhileOf(file);

		expect(typeof message).toBe('string');
		expect((message as string).trim()).not.toBe('');
		expect(message).not.toBe(ENGLISH);
	});
});

/**
 * The message of an invoice status action (void, paid, unpaid, sent, void and replace) refused because the invoice
 * changed after it was read (#5382): every locale states it in its own language.
 */
function actionChangedMeanwhileOf(file: string): unknown {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as { invoices?: { actions?: Record<string, unknown> } };
	return messages.invoices?.actions?.CHANGED_MEANWHILE;
}

const ACTION_ENGLISH = actionChangedMeanwhileOf('en.json');

describe('the message of an invoice status action refused as changed meanwhile', () => {
	it('is stated in English', () => {
		expect(ACTION_ENGLISH).toBe(
			'This invoice changed since it was shown, so nothing was changed. Refresh it to see its current version, then try again.'
		);
	});

	it.each(LOCALE_FILES.filter((file) => file !== 'en.json'))('is translated in %s', (file) => {
		const message = actionChangedMeanwhileOf(file);

		expect(typeof message).toBe('string');
		expect((message as string).trim()).not.toBe('');
		expect(message).not.toBe(ACTION_ENGLISH);
	});
});
