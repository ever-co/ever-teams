import { appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
	FATAL = 'FATAL'
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	details?: any;
	context?: string;
}

export interface LoggerConfig {
	logDir?: string;
	console?: boolean;
	maxFileSize?: number; // maximum file size in bytes
	dateFormat?: 'daily' | 'hourly'; // file rotation format
	environment?: 'development' | 'production' | 'test';
}

export class Logger {
	private config: Required<LoggerConfig>;
	private static instance: Logger;

	private static readonly DEFAULT_CONFIG: Required<LoggerConfig> = {
		logDir: 'logs',
		console: true,
		maxFileSize: 5 * 1024 * 1024, // 5MB by default
		dateFormat: 'daily',
		environment: (process.env.NODE_ENV as any) || 'development'
	};

	private constructor(config?: LoggerConfig) {
		this.config = {
			...Logger.DEFAULT_CONFIG,
			...config
		};
		this.ensureLogDirExists();
	}

	/**
	 * Get the singleton instance of the logger
	 */
	public static getInstance(config?: LoggerConfig): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger(config);
		}
		return Logger.instance;
	}

	/**
	 * Configure the logger
	 */
	public configure(config: Partial<LoggerConfig>): void {
		this.config = {
			...this.config,
			...config
		};
		this.ensureLogDirExists();
	}

	/**
	 * Log a message at the DEBUG level
	 */
	public debug(message: string, details?: any, context = 'App'): void {
		this.log(LogLevel.DEBUG, message, details, context);
	}

	/**
	 * Log a message at the INFO level
	 */
	public info(message: string, details?: any, context = 'App'): void {
		this.log(LogLevel.INFO, message, details, context);
	}

	/**
	 * Log a message at the WARN level
	 */
	public warn(message: string, details?: any, context = 'App'): void {
		this.log(LogLevel.WARN, message, details, context);
	}

	/**
	 * Log a message at the ERROR level
	 */
	public error(message: string, details?: any, context = 'App'): void {
		this.log(LogLevel.ERROR, message, details, context);
	}

	/**
	 * Log a message at the FATAL level
	 */
	public fatal(message: string, details?: any, context = 'App'): void {
		this.log(LogLevel.FATAL, message, details, context);
	}

	/**
	 * Log a message with the specified level
	 */
	private log(level: LogLevel, message: string, details?: any, context = 'App'): void {
		const now = new Date();
		const timestamp = now.toISOString();

		const logEntry: LogEntry = {
			timestamp,
			level,
			message,
			context,
			details: this.sanitizeDetails(details)
		};

		// Display in the console if enabled
		if (this.config.console) {
			this.logToConsole(logEntry);
		}

		// Log to a file if we are not in a browser environment
		if (Logger.isServer()) {
			this.logToFile(logEntry);
		}
	}

	/**
	 * Display a log message in the console
	 */
	private formatLogEntry(logEntry: LogEntry): string {
		const { timestamp, level, message, context } = logEntry;
		return `[${timestamp}] [${level}] [${context}] ${message}`;
	}

	private logToConsole(logEntry: LogEntry): void {
		const formattedMessage = this.formatLogEntry(logEntry);
		const details = logEntry.details || '';

		switch (logEntry.level) {
			case LogLevel.DEBUG:
				console.debug(formattedMessage, details);
				break;
			case LogLevel.INFO:
				console.info(formattedMessage, details);
				break;
			case LogLevel.WARN:
				console.warn(formattedMessage, details);
				break;
			case LogLevel.ERROR:
			case LogLevel.FATAL:
				console.error(formattedMessage, details);
				break;
		}
	}

	/**
	 * Append a log entry to a file
	 */
	private async appendToLogFile(filename: string, logEntry: LogEntry) {
		const filePath = join(this.config.logDir, filename);
		const logString = JSON.stringify(logEntry, null, 2) + '\n';

		await appendFile(filePath, logString, { encoding: 'utf8' });
	}

	/**
	 * Log a message to a file
	 */
	private logToFile(logEntry: LogEntry): void {
		try {
			const { timestamp, level } = logEntry;
			const date = new Date(timestamp);

			// Create the filename based on the date
			let filename: string;
			if (this.config.dateFormat === 'hourly') {
				filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
					2,
					'0'
				)}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}.log`;
			} else {
				filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
					2,
					'0'
				)}-${String(date.getDate()).padStart(2, '0')}.log`;
			}

			// Create a specific file for errors if it is an error
			if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
				const errorFilename = `error-${filename}`;
				this.appendToLogFile(errorFilename, logEntry);
			}

			// Always log to the main log file
			this.appendToLogFile(filename, logEntry);
		} catch (error) {
			console.error('Failed to write to log file:', error);
		}
	}

	/**
	 * Get the absolute path for a relative directory to the project root
	 * Compatible with the development and production environments of Next.js
	 */
	public static async getAbsolutePath(relativePath: string): Promise<string> {
		if (!Logger.isServer()) {
			throw new Error('This function can only be called on the server');
		}

		// Determine the project root
		let rootDir: string;

		// In development, the process runs at the project root
		// In production with Next.js, the process generally runs in .next/server/
		if (await Logger.isProjectRootDir(process.cwd())) {
			// In production environment
			rootDir = resolve(process.cwd(), '../../');
		} else {
			// In development environment
			rootDir = process.cwd();
		}

		return resolve(rootDir, relativePath);
	}

	private static isProjectRootDir(dir: string): boolean {
		return (
			existsSync(join(dir, 'package.json')) ||
			existsSync(join(dir, 'next.config.js')) ||
			existsSync(join(dir, '.next'))
		);
	}

	/**
	 * Create a directory recursively if it does not exist
	 */
	public static async ensureDirectoryExists(dirPath: string): Promise<void> {
		if (!Logger.isServer()) {
			return; // Nothing to do on the client
		}

		const absolutePath = await Logger.getAbsolutePath(dirPath);

		if (!existsSync(absolutePath)) {
			try {
				await mkdir(absolutePath, { recursive: true });
			} catch (err) {
				console.error('[FsUtils] Failed to create directory', absolutePath, err);
			}
		}
	}

	/**
	 * Append content to an existing file or create it if it does not exist
	 */
	public static async appendToFile(
		filePath: string,
		content: string,
		encoding: BufferEncoding = 'utf8'
	): Promise<void> {
		if (!Logger.isServer()) {
			return; // Nothing to do on the client
		}

		const absolutePath = await Logger.getAbsolutePath(filePath);
		const dirPath = dirname(absolutePath);

		await Logger.ensureDirectoryExists(dirPath);
		await appendFile(absolutePath, content, { encoding });
	}
	/**
	 * Ensure that the log directory exists
	 */
	private async ensureLogDirExists(): Promise<void> {
		if (Logger.isServer()) {
			try {
				if (!existsSync(this.config.logDir)) {
					await mkdir(this.config.logDir, { recursive: true });
				}
			} catch (error) {
				console.error(`Failed to create log directory: ${this.config.logDir}`, error);
			}
		}
	}

	/**
	 * @description Check if the code is running in a server or client environment
	 */

	public static isServer(): boolean {
		return typeof window === 'undefined';
	}
	/**
	 * Sanitize the details to avoid serialization errors
	 */
	private sanitizeDetails(details: any): any {
		if (!details) return undefined;

		try {
			// Test of serialization to check if the object can be serialized
			JSON.stringify(details, null, 2);
			return details;
		} catch (error) {
			// If serialization fails, convert to string
			return String(details);
		}
	}
}
