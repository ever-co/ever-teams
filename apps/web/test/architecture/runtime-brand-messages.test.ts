/**
 * Architecture guard: brand text in translations follows the deployment's runtime APP_NAME.
 *
 * A published Docker image is rebranded with `docker run -e APP_NAME=...`, but a message that spells
 * the brand out ("Ever Teams Assistant") or translates it word by word ignores that. These
 * messages carry the `{appName}` placeholder instead, and every call site must pass `{ appName }`:
 * next-intl reports a formatting error (and renders the key) when a placeholder gets no value.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const WEB_ROOT = resolve(__dirname, '../..');
const LOCALES_DIRECTORY = join(WEB_ROOT, 'locales');
const BRAND_MESSAGES = ['TITLE', 'chatView.ASSISTANT_NAME', 'chatView.OPEN_ASSISTANT'] as const;

type Messages = { [key: string]: string | Messages };

function messageAt(messages: Messages, path: string): unknown {
	return path.split('.').reduce<unknown>((node, key) => (node as Messages | undefined)?.[key], messages);
}

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
	});
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const KEYS = BRAND_MESSAGES.map(escapeRegExp).join('|');

describe('runtime brand in translations', () => {
	it.each(readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json')))(
		'names the product through {appName} in %s',
		(file) => {
			const messages = JSON.parse(readFileSync(join(LOCALES_DIRECTORY, file), 'utf8')) as Messages;

			// The brand itself is never translated.
			expect(messages.TITLE).toBe('{appName}');
			for (const key of BRAND_MESSAGES) {
				const value = messageAt(messages, key);
				expect(typeof value).toBe('string');
				expect(value).not.toMatch(/Ever\s*Teams/i);
				// appName is the only argument, which is what the call sites below provide.
				expect((value as string).match(/\{[^}]*\}/g)).toEqual(['{appName}']);
			}
		}
	);

	it('passes appName wherever these messages are rendered', () => {
		const keyLiteral = new RegExp(String.raw`(['"\x60])(${KEYS})\1`, 'g');
		const call = new RegExp(String.raw`\bt\(\s*(['"])(${KEYS})\1([^)]*)\)`, 'g');
		const rendered = new Set<string>();
		const offenders: string[] = [];

		for (const file of [...sourceFiles(join(WEB_ROOT, 'app')), ...sourceFiles(join(WEB_ROOT, 'core'))]) {
			const source = readFileSync(file, 'utf8');
			const calls = [...source.matchAll(call)];
			// Every mention of these keys must be a t() call this test can check.
			if (calls.length !== [...source.matchAll(keyLiteral)].length) {
				offenders.push(`${relative(WEB_ROOT, file)}: key used outside a t() call`);
			}
			for (const [text, , key, args] of calls) {
				rendered.add(key);
				if (!/\bappName\b/.test(args)) offenders.push(`${relative(WEB_ROOT, file)}: ${text}`);
			}
		}

		expect(offenders).toEqual([]);
		expect([...rendered].sort()).toEqual([...BRAND_MESSAGES].sort());
	});
});
