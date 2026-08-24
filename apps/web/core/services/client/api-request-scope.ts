import type { APIConfig } from './axios';

/** Immutable request identity captured by a fast React Query closure. */
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
	return {
		tenantId: scope.tenantId,
		signal,
		pinnedAuthorization: true,
		headers: scope.accessToken ? { Authorization: `Bearer ${scope.accessToken}` } : undefined
	};
}
