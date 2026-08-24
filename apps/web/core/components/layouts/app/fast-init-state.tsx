import { useTimeLogs } from '@/core/hooks/activities/time-logs/use-time-logs';

export function FastInitState() {
	useTimeLogs();
	return null;
}
