'use server';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { LogEntry } from '@/core/types/generics';

import { readdir, stat, rm } from 'fs/promises';

/*
 * 🛑 Every function exported from this 'use server' module is a Server Action: client code imports the logger, so
 * anyone who can reach the app can call these with arguments of their choosing. None of them may take a path from
 * its caller. (`logServerToFile(logDir, filename, ...)` used to append to any file the server could write, and
 * appending a JSON key such as "$(curl ...|sh)" to a shell profile runs it.)
 */

/** The logger's directory (`Logger`'s default `logDir`), relative to the working directory. */
const LOG_DIR = 'logs';

/** A log file name: one path segment, ending in `.log`. */
const LOG_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.log$/;

/**
 * Append a log entry to a file of the log directory. Development only.
 *
 * @param filename - The file name (`2026-10-20.log`, or a custom `<name>.log`); anything that is not a plain
 * `.log` file name is refused.
 * @param logEntry - The entry to append.
 */
export async function logServerToFile(filename: string, logEntry: LogEntry) {
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	if (typeof filename !== 'string' || !LOG_FILE_NAME.test(filename)) {
		throw new Error('Invalid log file name');
	}

	const logString = JSON.stringify(logEntry, null, 2) + '\n';

	await appendFile(join(LOG_DIR, filename), logString, { encoding: 'utf8' });
}

/**
 * Ensure that the log directory exists, and empty it when it has grown past `LOG_FOLDER_MAX_SIZE` MB. Development
 * only.
 */
export async function createLogDir(): Promise<void> {
	if (process.env.NODE_ENV === 'production') {
		return;
	}

	try {
		if (!existsSync(LOG_DIR)) {
			await mkdir(LOG_DIR, { recursive: true });
		} else {
			// Clean up logs if they're too big - don't await to avoid blocking
			cleanIfTooBig(LOG_DIR, Number(process.env.LOG_FOLDER_MAX_SIZE || 10)).catch((error) => {});
		}
	} catch (error) {
		console.error(`[Logger] Failed to create log directory: ${LOG_DIR}`, error);
	}
}

/**
 * Calculate the size of a folder recursively
 */
async function getFolderSizeInBytes(dirPath: string): Promise<number> {
	let totalSize = 0;

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);
			try {
				if (entry.isDirectory()) {
					totalSize += await getFolderSizeInBytes(fullPath);
				} else {
					const fileStat = await stat(fullPath);
					totalSize += fileStat.size;
				}
			} catch (fileError: any) {
				// Skip files that don't exist or can't be accessed
				if (fileError.code !== 'ENOENT') {
					console.warn(`[Logger] Warning: Could not stat file ${fullPath}:`, fileError.message);
				}
				// Continue with other files
			}
		}
	} catch (dirError: any) {
		// Directory doesn't exist or can't be read
		if (dirError.code !== 'ENOENT') {
			console.warn(`[Logger] Warning: Could not read directory ${dirPath}:`, dirError.message);
		}
		return 0;
	}

	return totalSize;
}

/**
 * Delete all the content of the folder (not the folder itself)
 */
async function clearFolder(dirPath: string): Promise<void> {
	const entries = await readdir(dirPath, { withFileTypes: true });

	await Promise.all(
		entries.map(async (entry) => {
			const fullPath = join(dirPath, entry.name);
			await rm(fullPath, { recursive: true, force: true });
		})
	);
}

/**
 * Delete it if the size > maxMB
 */
async function cleanIfTooBig(dirPath: string, maxMB = 10): Promise<void> {
	try {
		const sizeInBytes = await getFolderSizeInBytes(dirPath);
		const sizeInMB = sizeInBytes / (1024 * 1024);

		if (sizeInMB > maxMB) {
			console.warn('⚠️⚠️⚠️ 📦 Logs folder too big. Cleaning up 🗑🧹...');
			await clearFolder(dirPath);
			console.log('✅ ✨ Logs folder cleared.');
		}
	} catch (error: any) {
		// Don't let logging errors crash the application
		console.warn(`[Logger] Warning: Could not clean logs directory ${dirPath}:`, error.message);
	}
}
