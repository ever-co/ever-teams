'use server';
import { appendFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { LogEntry } from '@/core/types/generics';
import { Logger } from './logger.service';
import { isServer } from '@/core/lib/helpers';

import { readdir, stat, rm } from 'fs/promises';
/**
 * Append a log entry to a file
 */
export async function logServerToFile(logDir: string, filename: string, logEntry: LogEntry) {
	if (process.env.NODE_ENV !== 'production') {
		const filePath = join(logDir, filename);
		const logString = JSON.stringify(logEntry, null, 2) + '\n';

		await appendFile(filePath, logString, { encoding: 'utf8' });
	}
}

/**
 * Create a directory recursively if it does not exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
	if (!isServer()) {
		return; // Nothing to do on the client
	}

	const absolutePath = await getAbsolutePath(dirPath);

	if (!existsSync(absolutePath)) {
		try {
			await mkdir(absolutePath, { recursive: true });
		} catch (err) {
			console.error('[FsUtils] Failed to create directory', absolutePath, err);
		}
	}
}

/**
 * Get the absolute path for a relative directory to the project root
 * Compatible with the development and production environments of Next.js
 */
export async function getAbsolutePath(relativePath: string): Promise<string> {
	if (!isServer()) {
		throw new Error('This function can only be called on the server');
	}

	// Determine the project root
	let rootDir: string;

	// In development, the process runs at the project root
	// In production with Next.js, the process generally runs in .next/server/
	if (await isProjectRootDir(process.cwd())) {
		// Development ‑ already at project root
		rootDir = process.cwd();
	} else {
		// Production ‑ running from .next/server or dist folder
		rootDir = resolve(process.cwd(), '../../');
	}

	return resolve(rootDir, relativePath);
}

export async function isProjectRootDir(dir: string): Promise<boolean> {
	return (
		existsSync(join(dir, 'package.json')) ||
		existsSync(join(dir, 'next.config.js')) ||
		existsSync(join(dir, '.next'))
	);
}

/**
 * Ensure that the log directory exists
 */
export async function createLogDir(logger: Logger): Promise<void> {
	const config = logger.getConfig();

	try {
		if (!existsSync(config.logDir!)) {
			await mkdir(config.logDir!, { recursive: true });
		} else {
			cleanIfTooBig(config.logDir!, Number(process.env.LOG_FOLDER_MAX_SIZE || 10));
		}
	} catch (error) {
		console.error(`Failed to create log directory: ${config.logDir}`, error);
	}
}

/**
 * Calculate the size of a folder recursively
 */
async function getFolderSizeInBytes(dirPath: string): Promise<number> {
	let totalSize = 0;
	const entries = await readdir(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dirPath, entry.name);
		if (entry.isDirectory()) {
			totalSize += await getFolderSizeInBytes(fullPath);
		} else {
			const fileStat = await stat(fullPath);
			totalSize += fileStat.size;
		}
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
	const sizeInBytes = await getFolderSizeInBytes(dirPath);
	const sizeInMB = sizeInBytes / (1024 * 1024);
	console.log(`📦 ${dirPath} = ${sizeInMB.toFixed(2)} MB, Max for this logs folder must be = ${maxMB.toFixed(2)} MB`);

	if (sizeInMB > maxMB) {
		console.warn('⚠️⚠️⚠️ 📦 Logs folder too big. Cleaning up 🗑🧹...');
		await clearFolder(dirPath);
		console.log('✅ ✨ Logs folder cleared.');
	} else {
		console.log(
			`✅ 📦 Logs folder size is within limit ${dirPath} = ${sizeInMB.toFixed(2)} MB <= ${maxMB.toFixed(2)} MB`
		);
	}
}
