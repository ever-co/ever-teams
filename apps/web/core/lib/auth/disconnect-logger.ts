import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { sendLogToAPI } from '@/core/services/logs/logger-client';
import { LogLevel } from '@/core/types/generics';

/**
 * Interface for disconnect log entries
 */
export interface DisconnectLogEntry {
	timestamp: string;
	reason: DisconnectionReason;
	details?: Record<string, any>;
	userAgent: string;
	stackTrace?: string;
}

/**
 * Capture stack trace for debugging where disconnection was triggered
 */
function captureStackTrace(): string {
	try {
		const stack = new Error().stack || '';
		// Get only the relevant part (skip first 2 lines)
		return stack.split('\n').slice(2, 8).join('\n');
	} catch {
		return '';
	}
}

/**
 * Centralized logging function for disconnections
 * Logs to console, localStorage, and sends to API for persistent storage
 *
 * @param reason - The reason for disconnection
 * @param details - Additional details about the disconnection
 */
export async function logDisconnection(reason: DisconnectionReason, details?: Record<string, any>): Promise<void> {
	const timestamp = new Date().toISOString();
	const stackTrace = captureStackTrace();

	const logEntry: DisconnectLogEntry = {
		timestamp,
		reason,
		details,
		userAgent: typeof globalThis.navigator !== 'undefined' ? globalThis.navigator.userAgent : 'N/A',
		stackTrace
	};

	// Log to console with structured format
	console.log(`[Logout] ${reason}`, logEntry);

	// Also log to localStorage for debugging (optional)
	try {
		if (typeof globalThis.window !== 'undefined' && globalThis.window.localStorage) {
			const logs = JSON.parse(localStorage.getItem('disconnect_logs') || '[]');
			logs.push(logEntry);

			// Keep only last 50 logs
			if (logs.length > 50) {
				logs.shift();
			}

			localStorage.setItem('disconnect_logs', JSON.stringify(logs));
		}
	} catch (error) {
		console.warn('[DisconnectLogger] Failed to save log to localStorage:', error);
	}

	// Send to API for persistent storage with custom filename
	const logEntryForAPI = {
		timestamp,
		level: LogLevel.ERROR,
		message: `User disconnected: ${reason}`,
		context: 'disconnect-logger.ts -> logDisconnection',
		details: {
			reason,
			...details,
			userAgent: logEntry.userAgent,
			stackTrace
		}
	};

	// Pass custom filename via details so API can use it
	sendLogToAPI({
		...logEntryForAPI,
		details: {
			...logEntryForAPI.details,
			context: 'disconnect-logger.ts -> logDisconnection',
			customLogFile: 'disconnect_logs'
		}
	});
}
