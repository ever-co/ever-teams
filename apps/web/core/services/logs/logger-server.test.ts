/**
 * `logger-server.ts` is a 'use server' module imported by client code (through the logger), so its exports are
 * Server Actions anyone can call with arguments of their choosing. `logServerToFile(logDir, filename, entry)` appended
 * to any file the server could write; it now takes a plain `.log` file name and writes in `logs/` only.
 *
 * Run against the real file system, in a scratch working directory.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LogEntry, LogLevel } from '@/core/types/generics';
import { createLogDir, logServerToFile } from './logger-server';

const entry: LogEntry = { timestamp: '2026-10-20T10:00:00.000Z', level: LogLevel.INFO, message: 'hello' };

describe('logger-server actions', () => {
	const cwd = process.cwd();
	const nodeEnv = process.env.NODE_ENV;
	let root: string;
	let work: string;

	const setNodeEnv = (value: string | undefined) => {
		(process.env as Record<string, string | undefined>).NODE_ENV = value;
	};
	/** Every file and directory under the scratch root, relative to it. */
	const tree = (dir = root, prefix = ''): string[] =>
		readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
			const path = prefix + item.name;
			return item.isDirectory() ? [path + '/', ...tree(join(dir, item.name), path + '/')] : [path];
		});

	beforeEach(() => {
		// The app runs in `root/app`; a write outside it would land in `root`.
		root = mkdtempSync(join(tmpdir(), 'logger-server-'));
		work = join(root, 'app');
		mkdirSync(join(work, 'logs'), { recursive: true });
		process.chdir(work);
	});

	afterEach(() => {
		process.chdir(cwd);
		rmSync(root, { recursive: true, force: true });
		setNodeEnv(nodeEnv);
	});

	it.each(['2026-10-20.log', '2026-10-20-09.log', 'disconnect_logs.log'])(
		'appends %s in the log directory',
		async (filename) => {
			await logServerToFile(filename, entry);
			await logServerToFile(filename, entry);

			const written = readFileSync(join(work, 'logs', filename), 'utf8');
			expect(written.match(/"hello"/g)).toHaveLength(2);
			expect(tree()).toEqual(['app/', 'app/logs/', `app/logs/${filename}`]);
		}
	);

	it.each([
		['a parent directory', '../../escaped.log'],
		['a path', 'nested/file.log'],
		['an absolute path', join(tmpdir(), 'escaped.log')],
		['a Windows path', '..\\..\\escaped.log'],
		['a file that is not a log', '.bashrc'],
		['a hidden file', '.hidden.log'],
		['no name', ''],
		['not a string', 42]
	])('refuses %s, and writes nothing', async (_label, filename) => {
		await expect(logServerToFile(filename as string, entry)).rejects.toThrow('Invalid log file name');

		expect(tree()).toEqual(['app/', 'app/logs/']);
	});

	it('takes no directory from its caller: an extra argument is not a path', async () => {
		await (logServerToFile as (...args: unknown[]) => Promise<void>)('2026-10-20.log', entry, root);

		expect(tree()).toEqual(['app/', 'app/logs/', 'app/logs/2026-10-20.log']);
	});

	it('creates the log directory, and only that, whatever it is passed', async () => {
		rmSync(join(work, 'logs'), { recursive: true });

		await (createLogDir as (...args: unknown[]) => Promise<void>)({
			getConfig: () => ({ logDir: join(root, 'elsewhere') })
		});

		expect(tree()).toEqual(['app/', 'app/logs/']);
	});

	it('writes and creates nothing in production', async () => {
		setNodeEnv('production');
		rmSync(join(work, 'logs'), { recursive: true });

		await logServerToFile('2026-10-20.log', entry);
		await createLogDir();

		expect(existsSync(join(work, 'logs'))).toBe(false);
		expect(tree()).toEqual(['app/']);
	});
});
