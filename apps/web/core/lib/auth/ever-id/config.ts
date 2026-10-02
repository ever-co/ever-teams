import { readRuntimeEnv } from '@/env-config';
import {
	EVER_ID_CLIENT_ID,
	EVER_ID_CLIENT_SECRET,
	EVER_ID_ISSUER_URL,
	EVER_ID_TEAMS_AUTO_PROVISION,
	EVER_PLATFORM_PROJECT_ID
} from '@/core/constants/config/constants';

/**
 * Ever ID sign-in settings (server side).
 *
 * The sign-in is OFF unless the deployment configures it: next-auth serves the provider, the button renders and
 * the Ever ID routes under /api/auth/ever-id answer only when NEXT_PUBLIC_EVER_ID_APP_NAME is set to a non-blank
 * name AND the issuer, client id and client secret are all non-blank. With any of them missing every one of those
 * routes answers 404 and nothing ever contacts the issuer or the Ever ID routes of the API.
 *
 * Two more conditions keep a misconfiguration from sending credentials where they do not belong: the issuer must
 * be an https URL (plain http only on the local machine), and the Gauzy API URL must be configured explicitly
 * (GAUZY_API_SERVER_URL or NEXT_PUBLIC_GAUZY_API_SERVER_URL): the ID tokens are exchanged there, so the sign-in
 * never falls back to the hosted API the other routes use when neither is set.
 */

/** The next-auth provider id: the callback is /api/auth/callback/ever-id. */
export const EVER_ID_PROVIDER_ID = 'ever-id';

/** Scopes of every Ever ID sign-in. The workspace is chosen here, so no organization scope is requested. */
const BASE_SCOPES = ['openid', 'profile', 'email', 'urn:zitadel:iam:user:resourceowner'] as const;

/** A project id is a plain identifier: anything else could smuggle extra scopes into the request. */
const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

interface EverIdConfig {
	issuer: string;
	clientId: string;
	clientSecret: string;
	projectId?: string;
	autoProvision: boolean;
}

/** One warning per process and key (the same registry as the other configuration warnings). */
function warnOnce(key: string, message: string): void {
	const registry = globalThis as typeof globalThis & { __everTeamsConfigWarnings?: Set<string> };
	registry.__everTeamsConfigWarnings ??= new Set<string>();
	if (registry.__everTeamsConfigWarnings.has(key)) return;
	registry.__everTeamsConfigWarnings.add(key);
	console.warn(message);
}

/**
 * NEXT_PUBLIC_EVER_ID_APP_NAME, read like the other NEXT_PUBLIC_<PROVIDER>_APP_NAME keys: the container env
 * first, the build-time value as the fallback. Unlike those, a blank value counts as unset.
 */
export function readEverIdAppName(): string | undefined {
	const name = readRuntimeEnv('NEXT_PUBLIC_EVER_ID_APP_NAME') ?? process.env.NEXT_PUBLIC_EVER_ID_APP_NAME;
	return name?.trim() ? name : undefined;
}

/** An https issuer, or a plain http one on the local machine (development and tests). */
function isAllowedIssuer(issuer: string): boolean {
	try {
		const url = new URL(issuer);
		return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
	} catch {
		return false;
	}
}

function isGauzyApiConfigured(): boolean {
	const publicUrl =
		readRuntimeEnv('NEXT_PUBLIC_GAUZY_API_SERVER_URL') ?? process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL;
	return !!(process.env.GAUZY_API_SERVER_URL?.trim() || publicUrl?.trim());
}

/** The Ever ID settings in effect, or `null` while the sign-in is off. */
export function getEverIdConfig(): EverIdConfig | null {
	if (readEverIdAppName() === undefined) return null;
	if (!EVER_ID_ISSUER_URL || !EVER_ID_CLIENT_ID || !EVER_ID_CLIENT_SECRET) return null;
	if (!isAllowedIssuer(EVER_ID_ISSUER_URL)) {
		warnOnce('EVER_ID_ISSUER_URL', 'EVER_ID_ISSUER_URL must be an https URL: the Ever ID sign-in stays off.');
		return null;
	}
	if (!isGauzyApiConfigured()) {
		warnOnce(
			'EVER_ID_GAUZY_API',
			'GAUZY_API_SERVER_URL and NEXT_PUBLIC_GAUZY_API_SERVER_URL are not set: the Ever ID sign-in stays off.'
		);
		return null;
	}
	return {
		issuer: EVER_ID_ISSUER_URL,
		clientId: EVER_ID_CLIENT_ID,
		clientSecret: EVER_ID_CLIENT_SECRET,
		projectId: everIdProjectId(),
		autoProvision: EVER_ID_TEAMS_AUTO_PROVISION
	};
}

/** Whether the Ever ID sign-in is on. */
export function isEverIdConfigured(): boolean {
	return getEverIdConfig() !== null;
}

function everIdProjectId(): string | undefined {
	if (!EVER_PLATFORM_PROJECT_ID) return undefined;
	if (PROJECT_ID_PATTERN.test(EVER_PLATFORM_PROJECT_ID)) return EVER_PLATFORM_PROJECT_ID;
	warnOnce(
		'EVER_PLATFORM_PROJECT_ID',
		'EVER_PLATFORM_PROJECT_ID is not a plain identifier: the Ever ID sign-in does not request its audience.'
	);
	return undefined;
}

/**
 * The scope of the authorization request: the base scopes, plus the platform project audience when
 * EVER_PLATFORM_PROJECT_ID is set to a valid id.
 */
export function everIdScope(): string {
	const projectId = everIdProjectId();
	const scopes: string[] = [...BASE_SCOPES];
	if (projectId) scopes.push(`urn:zitadel:iam:org:project:id:${projectId}:aud`);
	return scopes.join(' ');
}
