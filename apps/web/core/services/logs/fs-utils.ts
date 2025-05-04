import fs from 'fs';
import path from 'path';

/**
 * Utilities for file system adapted to Next.js
 */
export class FsUtils {
	/**
	 * Check if the code is running in a server or client environment
	 */
	public static isServer(): boolean {
		return typeof window === 'undefined';
	}

	/**
	 * Get the absolute path for a relative directory to the project root
	 * Compatible with the development and production environments of Next.js
	 */
	public static getAbsolutePath(relativePath: string): string {
		if (!FsUtils.isServer()) {
			throw new Error('This function can only be called on the server');
		}

		// Determine the project root
		let rootDir: string;

		// In development, the process runs at the project root
		// In production with Next.js, the process generally runs in .next/server/
		if (process.cwd().includes('.next')) {
			// In production environment
			rootDir = path.resolve(process.cwd(), '../../');
		} else {
			// In development environment
			rootDir = process.cwd();
		}

		return path.resolve(rootDir, relativePath);
	}

	/**
	 * Create a directory recursively if it does not exist
	 */
	public static ensureDirectoryExists(dirPath: string): void {
		if (!FsUtils.isServer()) {
			return; // Nothing to do on the client
		}

		const absolutePath = FsUtils.getAbsolutePath(dirPath);

		if (!fs.existsSync(absolutePath)) {
			fs.mkdirSync(absolutePath, { recursive: true });
		}
	}

	/**
	 * Write a content to a file ensuring that the parent directory exists
	 */
	public static writeToFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
		if (!FsUtils.isServer()) {
			return; // Nothing to do on the client
		}

		const absolutePath = FsUtils.getAbsolutePath(filePath);
		const dirPath = path.dirname(absolutePath);

		FsUtils.ensureDirectoryExists(dirPath);
		fs.writeFileSync(absolutePath, content, { encoding });
	}

	/**
	 * Append content to an existing file or create it if it does not exist
	 */
	public static appendToFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
		if (!FsUtils.isServer()) {
			return; // Nothing to do on the client
		}

		const absolutePath = FsUtils.getAbsolutePath(filePath);
		const dirPath = path.dirname(absolutePath);

		FsUtils.ensureDirectoryExists(dirPath);
		fs.appendFileSync(absolutePath, content, { encoding });
	}
}
