import { isLocalHost } from '@ever-co/connect-sdk';
import { warnOnce } from './env';

/**
 * Server-side settings of the anonymous usage statistics (never imported by browser code).
 *
 * - `EVER_STATS_API_URL`: where the report goes; default `EVER_PLATFORM_API_URL`, then the public Ever
 *   Platform API. https only; plain http only for a local address (this machine or a private address range).
 * - `EVER_INSTALL_SOURCE`: what the operator declares (`self-hosted` by default); never guessed.
 * - `EVER_STATS_COUNTRY`: an ISO 3166-1 alpha-2 code the operator declares, `ZZ` otherwise; never guessed.
 * - `EVER_STATS_SEND_INTERVAL_S`: tests only, honoured for a local statistics address only.
 * - The paired API: `GAUZY_API_SERVER_URL` (or `NEXT_PUBLIC_GAUZY_API_SERVER_URL`) exactly as configured.
 *   The statistics never fall back to a hosted API when neither is set.
 */

type Env = Record<string, string | undefined>;

export const DEFAULT_EVER_PLATFORM_API_URL = 'https://api.ever.co';

const INSTALL_SOURCE_PATTERN = /^(cloud|self-hosted|ever\.sh|works_app|desktop|partner:[a-z0-9-]{2,32})$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const MAX_TEST_INTERVAL_S = 86_400;

const blank = (value: string | undefined): value is undefined => value === undefined || value.trim() === '';

/** `EVER_INSTALL_SOURCE` as declared, or `self-hosted`. */
export function readInstallSource(env: Env = process.env as Env): string {
	const raw = env.EVER_INSTALL_SOURCE;
	if (blank(raw)) return 'self-hosted';
	const value = raw.trim();
	if (INSTALL_SOURCE_PATTERN.test(value)) return value;
	warnOnce(
		'ever-platform:EVER_INSTALL_SOURCE',
		'EVER_INSTALL_SOURCE is not one of cloud, self-hosted, ever.sh, works_app, desktop or partner:<name>: self-hosted applies.'
	);
	return 'self-hosted';
}

/** `EVER_STATS_COUNTRY` (two capital letters), or `ZZ` (undeclared). */
export function readStatsCountry(env: Env = process.env as Env): string {
	const raw = env.EVER_STATS_COUNTRY;
	if (blank(raw)) return 'ZZ';
	const value = raw.trim();
	if (COUNTRY_PATTERN.test(value)) return value;
	warnOnce(
		'ever-platform:EVER_STATS_COUNTRY',
		'EVER_STATS_COUNTRY must be two capital letters (ISO 3166-1 alpha-2): ZZ applies.'
	);
	return 'ZZ';
}

/** An https URL, or plain http to a local address; no credentials in it. Answers the URL without a trailing slash. */
function usableBaseUrl(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.username || url.password || url.search || url.hash) return null;
	if (url.protocol === 'http:' && !isLocalHost(url.hostname)) return null;
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	let path = url.pathname;
	while (path.endsWith('/')) path = path.slice(0, -1);
	return `${url.origin}${path}`;
}

/** Where reports are sent, or `null` when the configured address cannot be used (then nothing is sent). */
export function readStatsApiUrl(env: Env = process.env as Env): string | null {
	const configured = !blank(env.EVER_STATS_API_URL)
		? env.EVER_STATS_API_URL
		: !blank(env.EVER_PLATFORM_API_URL)
			? env.EVER_PLATFORM_API_URL
			: DEFAULT_EVER_PLATFORM_API_URL;
	const url = usableBaseUrl(configured as string);
	if (!url) {
		warnOnce(
			'ever-platform:EVER_STATS_API_URL',
			'EVER_STATS_API_URL must be an https URL (plain http only for a local address): no statistics report is sent.'
		);
	}
	return url;
}

/** Whether a base URL points at this machine or a private address range. */
export function isLocalBaseUrl(baseUrl: string): boolean {
	try {
		return isLocalHost(new URL(baseUrl).hostname);
	} catch {
		return false;
	}
}

/**
 * `EVER_STATS_SEND_INTERVAL_S` (whole seconds, 1 to 86400), honoured only when reports go to a local
 * address (tests and audits); otherwise the daily schedule applies.
 */
export function readSendIntervalS(statsApiUrl: string | null, env: Env = process.env as Env): number | null {
	const raw = env.EVER_STATS_SEND_INTERVAL_S;
	if (blank(raw)) return null;
	const value = Number(raw.trim());
	if (!Number.isInteger(value) || value < 1 || value > MAX_TEST_INTERVAL_S) {
		warnOnce('ever-platform:EVER_STATS_SEND_INTERVAL_S', 'EVER_STATS_SEND_INTERVAL_S is not a whole number of seconds: ignored.');
		return null;
	}
	if (!statsApiUrl || !isLocalBaseUrl(statsApiUrl)) {
		warnOnce(
			'ever-platform:EVER_STATS_SEND_INTERVAL_S:remote',
			'EVER_STATS_SEND_INTERVAL_S applies only to a local statistics address: the daily schedule applies.'
		);
		return null;
	}
	return value;
}

/**
 * The `/api` base of the paired API, exactly as this deployment configures it, or `null` when it
 * configures none (the statistics then stay silent instead of asking a hosted API).
 */
export function readPairedApiUrl(env: Env = process.env as Env): string | null {
	const configured = !blank(env.GAUZY_API_SERVER_URL)
		? env.GAUZY_API_SERVER_URL
		: !blank(env.NEXT_PUBLIC_GAUZY_API_SERVER_URL)
			? env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
			: undefined;
	if (!configured) return null;
	let base = configured.trim();
	while (base.endsWith('/')) base = base.slice(0, -1);
	return `${base}/api`;
}
