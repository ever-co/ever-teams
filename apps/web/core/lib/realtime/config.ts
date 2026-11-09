import { readRuntimeEnv } from '@/env-config';

/** How many events one catch-up page asks for. */
export const REALTIME_CATCH_UP_LIMIT = 200;

/** Reconnect backoff: jittered exponential from the first to the second value. */
export const REALTIME_BACKOFF_MIN_MS = 1_000;
export const REALTIME_BACKOFF_MAX_MS = 30_000;

/** A ping is sent this often on a quiet socket; two silent intervals mean the socket is dead. */
export const REALTIME_PING_INTERVAL_MS = 25_000;

/** No keyboard, mouse or touch input for this long reports the tab idle. */
export const REALTIME_IDLE_AFTER_MS = 10 * 60_000;

/**
 * Whether this deployment turns the real-time channel on (`NEXT_PUBLIC_REALTIME_ENABLED=true`, read at
 * runtime). Off by default: the app then keeps every polling cadence it has today.
 */
export function isRealtimeEnabled(): boolean {
	const value = readRuntimeEnv('NEXT_PUBLIC_REALTIME_ENABLED') || process.env.NEXT_PUBLIC_REALTIME_ENABLED;
	return String(value ?? '').trim() === 'true';
}

/**
 * The WebSocket URL of the platform's GraphQL endpoint, from an explicit `url` (`NEXT_PUBLIC_REALTIME_URL`) or
 * derived from the API URL the browser calls directly (`NEXT_PUBLIC_GAUZY_API_SERVER_URL`, with or without its
 * `/api` suffix): `https://api.example.com/api` → `wss://api.example.com/graphql`.
 *
 * `null` when neither is set — a proxy-mode deployment without an explicit URL has no socket to open, and the
 * app stays on polling.
 */
export function socketUrlFrom(url: string | undefined | null, apiUrl: string | undefined | null): string | null {
	const explicit = String(url ?? '').trim();
	if (explicit) {
		return explicit.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
	}
	const api = String(apiUrl ?? '').trim();
	if (!api) return null;
	const origin = api.replace(/\/+$/, '').replace(/\/api$/i, '');
	if (!/^(https?|wss?):\/\//i.test(origin)) return null;
	return origin.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:') + '/graphql';
}

/** The socket URL of this deployment (see {@link socketUrlFrom}), read at runtime. */
export function realtimeSocketUrl(): string | null {
	return socketUrlFrom(
		readRuntimeEnv('NEXT_PUBLIC_REALTIME_URL') || process.env.NEXT_PUBLIC_REALTIME_URL,
		readRuntimeEnv('NEXT_PUBLIC_GAUZY_API_SERVER_URL') || process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
	);
}
