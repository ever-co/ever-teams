import { LogEntry, LoggerConfig, LogLevel } from '@/core/types/generics';
import { sendLogToAPI } from './logger-client';
import { logServerToFile } from './logger-server';
import { isServer } from '@/core/lib/helpers';
import { ACTIVE_LOCAL_LOG_SYSTEM } from '@/core/constants/config/constants';

export class Logger {
	private config: LoggerConfig;
	private static instance: Logger;
	private loggerInstance: Logger | null = null;

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
	}

	public getConfig() {
		return this.config;
	}
	public getLoggerInstance() {
		if (!this.loggerInstance) {
			this.loggerInstance = new Logger(this.config);
		}
		return this.loggerInstance;
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
		this.logToConsole(logEntry);

		this.logToFile(logEntry);
	}

	/**
	 * Display a log message in the console
	 */
	private formatLogEntry(logEntry: LogEntry): string {
		const { timestamp, level, message, context } = logEntry;
		return `[${timestamp}] [${level}] [${context}] ${message}`;
	}

	public simpleLogToConsole(logEntry: LogEntry): void {
		const formattedMessage = this.formatLogEntry(logEntry);

		switch (logEntry.level) {
			case LogLevel.DEBUG:
				console.debug(formattedMessage);
				break;
			case LogLevel.INFO:
				console.info(formattedMessage);
				break;
			case LogLevel.WARN:
				console.warn(formattedMessage);
				break;
			case LogLevel.ERROR:
			case LogLevel.FATAL:
				console.error(formattedMessage);
				break;
			default:
				console.log(formattedMessage);
				break;
		}
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
			default:
				console.log(formattedMessage, details);
				break;
		}
	}

	/**
	 * Append a log entry to a file
	 */
	private async appendToLogFile(filename: string, logEntry: LogEntry) {
		if (ACTIVE_LOCAL_LOG_SYSTEM.value) {
			console.log(`<== A NEW LOG WAS BEEN WRITTEN TO FILE==> ${filename}`);
			if (isServer()) {
				await logServerToFile(this.config.logDir!, filename, logEntry); // fs
			} else {
				await sendLogToAPI(logEntry); // client
			}
		}
	}

	/**
	 * Log a message to a file
	 */
	public logToFile(logEntry: LogEntry): void {
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
	 * @description Check if the code is running in a server or client environment
	 */

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
