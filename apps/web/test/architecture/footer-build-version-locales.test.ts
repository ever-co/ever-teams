import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const BUILD_VERSION_KEYS = ['BUILD_WEB', 'API_VERSION', 'OPEN_COMMIT'] as const;

describe('footer build-version translations', () => {
	it.each(readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json')))(
		'defines build identity messages in %s',
		(file) => {
			const messages = JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as {
				layout: { footer: Record<string, string> };
			};

			for (const key of BUILD_VERSION_KEYS) {
				expect(messages.layout.footer[key]).toBeTruthy();
			}
		}
	);
});
