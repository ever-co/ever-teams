import type { APIConfig } from './axios';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';

/** Tenant identity captured by a fast React Query closure, plus its token fallback. */
export interface ApiRequestScope {
	tenantId?: string | null;
	organizationId?: string | null;
	teamId?: string | null;
	userId?: string | null;
	accessToken?: string | null;
}

export interface ScopedReadOptions {
	scope: ApiRequestScope;
	signal?: AbortSignal;
}

export function scopedReadConfig({ scope, signal }: ScopedReadOptions): APIConfig {
	// A long-lived query owner can outlive an access-token rotation. Resolve the
	// current token when the request is built while keeping the captured tenant
	// identity and pinning the resulting Authorization header for this request.
	const accessToken = getAccessTokenCookie() ?? scope.accessToken;
	return {
		tenantId: scope.tenantId,
		signal,
		pinnedAuthorization: true,
		headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
	};
}
