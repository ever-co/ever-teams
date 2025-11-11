import { LogEntry } from '@/core/types/generics';
import axios from 'axios';

// Create a separate axios instance for logging to avoid auth interceptor conflicts
const logAxios = axios.create({
	timeout: 5000,
	withCredentials: false,
	headers: {
		'Content-Type': 'application/json'
	}
});

export async function sendLogToAPI(entry: LogEntry) {
	try {
		// Validate log entry before sending
		if (!entry) {
			console.warn('[Logger] Cannot send empty log entry to API');
			return;
		}

		// Ensure required fields are present
		if (!entry.timestamp || !entry.level || !entry.message) {
			console.warn('[Logger] Invalid log entry - missing required fields:', {
				hasTimestamp: !!entry.timestamp,
				hasLevel: !!entry.level,
				hasMessage: !!entry.message
			});
			return;
		}

		// Create a clean copy to avoid circular references
		const cleanEntry: LogEntry = {
			timestamp: entry.timestamp,
			level: entry.level,
			message: entry.message,
			context: entry.context || 'App',
			details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : undefined
		};

		// Use dedicated log axios instance to avoid auth interceptor conflicts
		await logAxios.post('/api/log', cleanEntry);
	} catch (err: any) {
		// Don't log axios errors to avoid infinite loops
		if (err?.code === 'ECONNABORTED') {
			console.warn('[Logger] Log request timed out');
		} else if (err?.response?.status >= 400) {
			console.warn(`[Logger] Log API returned ${err.response.status}:`, err.response.data?.error || 'Unknown error');
		} else {
			console.warn('[Logger] Failed to send log to server:', err?.message || 'Unknown error');
		}
	}
}
