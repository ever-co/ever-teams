import { LogEntry } from '@/core/types/generics';
import axios from 'axios';
export async function sendLogToAPI(entry: LogEntry) {
	try {
		await axios.post('/api/log', entry);
	} catch (err) {
		console.warn('[Logger] Failed to send log to server:', err);
	}
}
