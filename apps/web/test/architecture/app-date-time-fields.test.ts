import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const WEB = resolve(__dirname, '../..');

const SOURCE_FOLDERS = ['app', 'core'];

const SOURCE_FILE = /\.tsx?$/;

const TEST_FILE = /\.test\.tsx?$/;

/** A native date or time input (`<input type="time">`, `<Input type="date">`, `type={'datetime-local'}`). */
const NATIVE_DATE_OR_TIME = /\btype=\{?\s*["'`](date|time|datetime-local|month|week)["'`]\s*\}?/;

function sourceFilesOf(folder: string): string[] {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		const path = join(folder, entry.name);
		if (entry.isDirectory()) {
			return sourceFilesOf(path);
		}
		const isSource = SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name);
		return isSource ? [path] : [];
	});
}

/**
 * Days and times are typed or picked in the app's own fields, `DateField` and `TimeField` (#5318): a native date or
 * time input opens the browser's picker, which follows neither the app's look nor the workspace's date format, clock
 * and first day of the week.
 */
describe('date and time fields are the app', () => {
	it('leaves no native date or time input in the web app', () => {
		const files = SOURCE_FOLDERS.flatMap((folder) => sourceFilesOf(resolve(WEB, folder)));
		const native = files
			.filter((file) => NATIVE_DATE_OR_TIME.test(readFileSync(file, 'utf8')))
			.map((file) => relative(WEB, file).replaceAll('\\', '/'));

		expect(files.length).toBeGreaterThan(100);
		expect(native).toEqual([]);
	});
});
