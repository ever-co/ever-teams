// The timesheet's source filter lists every TimerSource value (Object.values): each one needs a label in both kit
// locales, or the filter shows the raw enum value. `yarn test` in packages/toolkit/atoms (node --test test/*.test.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const enumsFile = path.join(here, '..', '..', '..', 'toolkit-types', 'src', 'lib', 'atoms', 'enums.ts');
const localeFile = (lang) => path.join(here, '..', 'src', 'lib', 'i18n', 'locales', `${lang}.json`);

// The enum as the kit ships it, from toolkit-types' source (its dist is not committed).
const loadTimerSource = async () => {
	const { code } = await esbuild.transform(fs.readFileSync(enumsFile, 'utf8'), { loader: 'ts', format: 'esm' });
	const { TimerSource } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
	return TimerSource;
};

for (const lang of ['en', 'fr']) {
	test(`every timer source has a label in the ${lang} kit locale`, async () => {
		const TimerSource = await loadTimerSource();
		const labels = JSON.parse(fs.readFileSync(localeFile(lang), 'utf8')).TIMESHEET.sources;

		const missing = Object.values(TimerSource).filter((source) => !labels[source]);

		assert.deepEqual(missing, []);
	});
}
