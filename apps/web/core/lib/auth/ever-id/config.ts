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
 * The sign-in is OFF unless the deployment configures it: next-auth serves the provider, the button
 * renders and the Ever ID routes under /api/auth/ever-id answer only when NEXT_PUBLIC_EVER_ID_APP_NAME is
 * set AND the issuer, client id and client secret are all non-blank. With any of them missing every
 * one of those routes answers 404 and nothing ever contacts the issuer or the Ever ID routes of the API.
 */

/** The next-auth provider id: the callback is /api/auth/callback/ever-id. */
export const EVER_ID_PROVIDER_ID = 'ever-id';

/** Scopes of every Ever ID sign-in. The workspace is chosen here, so no organization scope is requested. */
const BASE_SCOPES = ['openid', 'profile', 'email', 'urn:zitadel:iam:user:resourceowner'] as const;

/** A project id is a plain identifier: anything else could smuggle extra scopes into the request. */
const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface EverIdConfig {
	issuer: string;
	clientId: string;
	clientSecret: string;
	projectId?: string;
	autoProvision: boolean;
}

/**
 * NEXT_PUBLIC_EVER_ID_APP_NAME, read like the other NEXT_PUBLIC_<PROVIDER>_APP_NAME keys: the container env
 * first, the build-time value as the fallback, and "set" (even to an empty string) versus "absent" is what
 * counts (`??`, not `||`).
 */
export function readEverIdAppName(): string | undefined {
	return readRuntimeEnv('NEXT_PUBLIC_EVER_ID_APP_NAME') ?? process.env.NEXT_PUBLIC_EVER_ID_APP_NAME;
}

/** The Ever ID settings in effect, or `null` while the sign-in is off. */
export function getEverIdConfig(): EverIdConfig | null {
	if (readEverIdAppName() === undefined) return null;
	if (!EVER_ID_ISSUER_URL || !EVER_ID_CLIENT_ID || !EVER_ID_CLIENT_SECRET) return null;
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
	return EVER_PLATFORM_PROJECT_ID && PROJECT_ID_PATTERN.test(EVER_PLATFORM_PROJECT_ID)
		? EVER_PLATFORM_PROJECT_ID
		: undefined;
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
