/**
 * Asks the paired API whether its anonymous usage statistics are on: `GET <api>/ever-stats/state`,
 * which answers `{ "enabled": true | false }` and exists only on an API that declares it serves this
 * web app (`EVER_STATS_SERVES` containing `teams`). The web app sends a report only after a
 * `200 { "enabled": true }`, so the operator's switch in the API (environment or settings) also
 * silences the web app, and an API that is unpaired, down or slow keeps it silent.
 *
 * The request goes to the configured API only, without a credential, a cookie or a redirect.
 */

export type PairedStatsState = 'enabled' | 'disabled' | 'unpaired' | 'unreachable';

export const PAIRED_STATE_TIMEOUT_MS = 5_000;

export async function readPairedStatsState(
	pairedApiUrl: string,
	fetchImpl: typeof globalThis.fetch = globalThis.fetch
): Promise<PairedStatsState> {
	let response: Response;
	try {
		response = await fetchImpl(`${pairedApiUrl}/ever-stats/state`, {
			method: 'GET',
			headers: { accept: 'application/json' },
			cache: 'no-store',
			credentials: 'omit',
			redirect: 'manual',
			signal: AbortSignal.timeout(PAIRED_STATE_TIMEOUT_MS)
		});
	} catch {
		return 'unreachable';
	}
	if (response.status === 404) return 'unpaired';
	if (response.status !== 200) return 'unreachable';
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		return 'unreachable';
	}
	const enabled = (body as { enabled?: unknown } | null)?.enabled;
	if (enabled === true) return 'enabled';
	if (enabled === false) return 'disabled';
	return 'unreachable';
}
