import type { APIConfig } from './axios';

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
	// Keep tenant identity and credentials from one render together. Mounted
	// owners receive a fresh scope from useReactiveAccessTokenCookie on rotation.
	const accessToken = scope.accessToken;
	return {
		tenantId: scope.tenantId,
		signal,
		pinnedAuthorization: true,
		headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
	};
}
