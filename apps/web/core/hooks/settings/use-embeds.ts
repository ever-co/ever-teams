'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { embedsService } from '@/core/services/client/api/embeds/embeds.service';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { userState } from '@/core/stores/user/user';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import type {
	CreatedEmbedCredential,
	EmbedAllowedOrigin,
	EmbedCredential
} from '@/core/types/schemas/embeds/embed.schema';

/**
 * Whether Settings → Embeds exists for this person:
 * - `loading`: the server has not answered yet;
 * - `enabled`: the server has embeds on, and the person administers the organization;
 * - `disabled`: the server has them off, or the API has no such routes at all (its 404);
 * - `forbidden`: the person is not an administrator of the organization (403);
 * - `error`: the question failed for another reason (offline, a 5xx): the page offers a retry.
 */
export type EmbedsAvailability = 'loading' | 'enabled' | 'disabled' | 'forbidden' | 'error';

interface ConfigRead {
	status: 'pending' | 'success' | 'error';
	data: { enabled: boolean } | undefined;
	error: unknown;
}

export function embedsAvailabilityOf(read: ConfigRead): EmbedsAvailability {
	// An answer the server gave stands: a later failed read keeps React Query's last data beside its error
	if (read.data) {
		if (read.data.enabled) {
			return 'enabled';
		}
		return 'disabled';
	}
	if (read.status === 'success') {
		return 'disabled';
	}
	if (read.status === 'error') {
		const status = errorStatusOf(read.error);
		if (status === 404) {
			return 'disabled';
		}
		if (status === 403) {
			return 'forbidden';
		}
		return 'error';
	}
	return 'loading';
}

/** Only a failure that may pass is worth asking again for: not a 4xx, which the next try would get again. */
function shouldRetry(failureCount: number, error: unknown): boolean {
	const status = errorStatusOf(error);
	const isClientRefusal = status !== null && status >= 400 && status < 500;
	if (isClientRefusal) {
		return false;
	}
	return failureCount < 2;
}

/** Whose embeds, in which organization; `null` before those are known. */
export interface EmbedsScope {
	tenantId: string;
	organizationId: string;
	userId: string;
}

export function useEmbedsScope(): EmbedsScope | null {
	const user = useAtomValue(userState);
	const team = useAtomValue(activeTeamState);
	const tenantId = team?.tenantId ?? user?.tenantId ?? null;
	const organizationId = team?.organizationId ?? null;
	const userId = user?.id ?? null;
	return useMemo(() => {
		if (!tenantId || !organizationId || !userId) {
			return null;
		}
		return { tenantId, organizationId, userId };
	}, [organizationId, tenantId, userId]);
}

/**
 * Asks the server whether it has embeds on (`GET /embed-credentials/config`, an organization admin's route), again at
 * most every five minutes. Not while `enabled` is false (the command palette is closed).
 */
export function useEmbedsAvailability(enabled = true) {
	const scope = useEmbedsScope();
	const query = useQuery({
		queryKey: queryKeys.embeds.config(scope?.tenantId, scope?.userId),
		queryFn: ({ signal }) => embedsService.readConfig(signal),
		enabled: enabled && scope !== null,
		staleTime: 5 * 60_000,
		retry: shouldRetry
	});
	const availability = embedsAvailabilityOf({ status: query.status, data: query.data, error: query.error });
	return { availability, retry: query.refetch };
}

const NO_ORIGINS: EmbedAllowedOrigin[] = [];
const NO_CREDENTIALS: EmbedCredential[] = [];

/** The sites the organization allows; asked only once the server said embeds are on. */
export function useEmbedAllowedOrigins(enabled: boolean) {
	const scope = useEmbedsScope();
	const query = useQuery({
		queryKey: queryKeys.embeds.origins(scope?.tenantId, scope?.organizationId),
		queryFn: ({ signal }) => embedsService.listOrigins(scope?.organizationId ?? '', signal),
		enabled: enabled && scope !== null,
		staleTime: 15_000
	});
	return {
		origins: query.data ?? NO_ORIGINS,
		isLoading: query.isPending && enabled,
		isError: query.isError,
		refetch: query.refetch
	};
}

/** The organization's working credentials, without secrets; asked only once the server said embeds are on. */
export function useEmbedCredentials(enabled: boolean) {
	const scope = useEmbedsScope();
	const query = useQuery({
		queryKey: queryKeys.embeds.credentials(scope?.tenantId, scope?.organizationId),
		queryFn: ({ signal }) => embedsService.listCredentials(scope?.organizationId ?? '', signal),
		enabled: enabled && scope !== null,
		staleTime: 15_000
	});
	return {
		credentials: query.data ?? NO_CREDENTIALS,
		isLoading: query.isPending && enabled,
		isError: query.isError,
		refetch: query.refetch
	};
}

/** Allows a site; the list is read again. A 400 means the platform did not take it as an origin. */
export function useAddEmbedOrigin() {
	const queryClient = useQueryClient();
	const scope = useEmbedsScope();
	return useMutation<EmbedAllowedOrigin, unknown, string>({
		mutationFn: (origin) => embedsService.addOrigin(scope?.organizationId ?? '', origin),
		// The form says why an origin was refused: the global fallback toast would say it twice
		meta: { handlesOwnError: true },
		onSettled: () =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.embeds.origins(scope?.tenantId, scope?.organizationId)
			})
	});
}

/** Removes a site; it leaves the list at once and the list is read again. */
export function useRemoveEmbedOrigin() {
	const queryClient = useQueryClient();
	const scope = useEmbedsScope();
	const listKey = queryKeys.embeds.origins(scope?.tenantId, scope?.organizationId);
	return useMutation<void, unknown, string>({
		mutationFn: (id) => embedsService.removeOrigin(id),
		meta: { handlesOwnError: true },
		onSuccess: (_result, id) => {
			queryClient.setQueryData<EmbedAllowedOrigin[]>(listKey, (origins) =>
				origins?.filter((row) => row.id !== id)
			);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: listKey })
	});
}

/**
 * Creates a credential; the list is read again so that it shows, without its secret. The answer, which holds the
 * secret, is dropped from React Query's cache as soon as nothing shows it.
 */
export function useCreateEmbedCredential() {
	const queryClient = useQueryClient();
	const scope = useEmbedsScope();
	return useMutation<CreatedEmbedCredential, unknown, string>({
		mutationFn: (name) => embedsService.createCredential(scope?.organizationId ?? '', name),
		gcTime: 0,
		meta: { handlesOwnError: true },
		onSettled: () =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.embeds.credentials(scope?.tenantId, scope?.organizationId)
			})
	});
}

/** Revokes a credential; it leaves the list at once and the list is read again. */
export function useRevokeEmbedCredential() {
	const queryClient = useQueryClient();
	const scope = useEmbedsScope();
	const listKey = queryKeys.embeds.credentials(scope?.tenantId, scope?.organizationId);
	return useMutation<void, unknown, string>({
		mutationFn: (id) => embedsService.revokeCredential(id),
		meta: { handlesOwnError: true },
		onSuccess: (_result, id) => {
			queryClient.setQueryData<EmbedCredential[]>(listKey, (rows) => rows?.filter((row) => row.id !== id));
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: listKey })
	});
}
