import { useRunHeartbeat } from './use-run-heartbeat';

/** The running timer's heartbeat, wherever the person is in the app: it draws nothing. */
export function RunHeartbeat(): null {
	useRunHeartbeat();
	return null;
}
