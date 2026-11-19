'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	EmbedClientNotLimitedError,
	EmbedMembersNotAddedError,
	embedsService
} from '@/core/services/client/api/embeds/embeds.service';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { userState } from '@/core/stores/user/user';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import type {
	CreatedEmbedCredential,
	EmbedAllowedOrigin,
	EmbedConfig,
	EmbedCredential,
	EmbedCredentialInput
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
	// A refusal is the server's answer even after an earlier yes (the person is no longer an administrator, or embeds
	// were turned off): React Query keeps that yes beside the error, and it must not keep the page open.
	if (read.status === 'error') {
		const status = errorStatusOf(read.error);
		if (status === 404) {
			return 'disabled';
		}
		if (status === 403) {
			return 'forbidden';
		}
	}
	// Any other failed read (offline a moment, a 5xx) keeps the answer the server gave
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
		return 'error';
	}
	return 'loading';
}

/**
 * Whether a new credential may be limited to one client: only when the server says it can. An older API drops the
 * client it is sent and would make a credential for the whole workspace.
 */
export function canLimitToClientOf(availability: EmbedsAvailability, config: EmbedConfig | undefined): boolean {
	if (availability !== 'enabled') {
		return false;
	}
	return config?.clientLimits === true;
}

/**
 * Whether a new credential may add the people it signs in as members: only when the server says it can. An older API
 * drops the option it is sent and would make a credential that adds nobody.
 */
export function canAllowAddMembersOf(availability: EmbedsAvailability, config: EmbedConfig | undefined): boolean {
	if (availability !== 'enabled') {
		return false;
	}
	return config?.addMembers === true;
}

/**
 * Whether the allowed sites offer the switch that lets people sign in from them: only when the server says it can. An
 * older API has no such setting.
 */
export function canAllowPersonSignInOf(availability: EmbedsAvailability, config: EmbedConfig | undefined): boolean {
	if (availability !== 'enabled') {
		return false;
	}
	return config?.personSignIn === true;
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
 * Asks the server whether it has embeds on, can limit a credential to one client, and can let a credential add members
 * (`GET /embed-credentials/config`, an organization admin's route), again at most every five minutes. Not while
 * `enabled` is false (the command palette is closed).
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
	const canLimitToClient = canLimitToClientOf(availability, query.data);
	const canAllowAddMembers = canAllowAddMembersOf(availability, query.data);
	const canAllowPersonSignIn = canAllowPersonSignInOf(availability, query.data);
	return { availability, canLimitToClient, canAllowAddMembers, canAllowPersonSignIn, retry: query.refetch };
}

// Every organization's list: a write settles on the list of the organization it was made in, even if the active
// organization changed meanwhile (ids are unique, so dropping one from every list touches only its own).
const EVERY_ORIGINS_LIST = [...queryKeys.embeds.all, 'origins'] as const;
const EVERY_CREDENTIALS_LIST = [...queryKeys.embeds.all, 'credentials'] as const;
// Every person's embeds config read
const EVERY_EMBEDS_CONFIG = [...queryKeys.embeds.all, 'config'] as const;

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
		onSettled: () => queryClient.invalidateQueries({ queryKey: EVERY_ORIGINS_LIST })
	});
}

/** Removes a site; it leaves the list at once and the list is read again. */
export function useRemoveEmbedOrigin() {
	const queryClient = useQueryClient();
	return useMutation<void, unknown, string>({
		mutationFn: (id) => embedsService.removeOrigin(id),
		meta: { handlesOwnError: true },
		onSuccess: (_result, id) => {
			queryClient.setQueriesData<EmbedAllowedOrigin[]>({ queryKey: EVERY_ORIGINS_LIST }, (origins) =>
				origins?.filter((row) => row.id !== id)
			);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: EVERY_ORIGINS_LIST })
	});
}

/** The setting a switch on an allowed site asks for. */
export interface PersonSignInChange {
	id: string;
	allowPersonSignIn: boolean;
}

type PersonSignInSetting = EmbedAllowedOrigin['allowPersonSignIn'];

const withPersonSignIn = (origins: EmbedAllowedOrigin[] | undefined, id: string, setting: PersonSignInSetting) =>
	origins?.map((row) => {
		if (row.id !== id) {
			return row;
		}
		return { ...row, allowPersonSignIn: setting };
	});

// The switches of every allowed site share this key: the list is read again once the last of them settles.
const PERSON_SIGN_IN_CHANGE = [...EVERY_ORIGINS_LIST, 'person-sign-in'] as const;

/**
 * Turns on or off whether people can sign in from an allowed site. The switch moves at once and goes back if the API
 * refuses, that switch only: another site's switch changed meanwhile keeps its own setting. The list is read again
 * once no switch waits for the API any more: a read while another change is on its way would show that site's
 * previous setting until its answer.
 */
export function useSetPersonSignIn() {
	const queryClient = useQueryClient();
	return useMutation<EmbedAllowedOrigin, unknown, PersonSignInChange, { before: PersonSignInSetting }>({
		mutationKey: PERSON_SIGN_IN_CHANGE,
		mutationFn: ({ id, allowPersonSignIn }) => embedsService.setPersonSignIn(id, allowPersonSignIn),
		// The row says why its switch went back: the global fallback toast would say it twice
		meta: { handlesOwnError: true },
		onMutate: async (change) => {
			await queryClient.cancelQueries({ queryKey: EVERY_ORIGINS_LIST });
			const lists = queryClient.getQueriesData<EmbedAllowedOrigin[]>({ queryKey: EVERY_ORIGINS_LIST });
			const rows = lists.flatMap(([, origins]) => origins ?? []);
			const before = rows.find((row) => row.id === change.id)?.allowPersonSignIn;
			queryClient.setQueriesData<EmbedAllowedOrigin[]>({ queryKey: EVERY_ORIGINS_LIST }, (origins) =>
				withPersonSignIn(origins, change.id, change.allowPersonSignIn)
			);
			return { before };
		},
		onError: (_error, change, context) => {
			queryClient.setQueriesData<EmbedAllowedOrigin[]>({ queryKey: EVERY_ORIGINS_LIST }, (origins) =>
				withPersonSignIn(origins, change.id, context?.before)
			);
		},
		onSettled: () => {
			// This change still counts among those running while it settles.
			const isLast = queryClient.isMutating({ mutationKey: PERSON_SIGN_IN_CHANGE }) <= 1;
			if (!isLast) {
				return;
			}
			return queryClient.invalidateQueries({ queryKey: EVERY_ORIGINS_LIST });
		}
	});
}

/**
 * Creates a credential; the list is read again so that it shows, without its secret. The answer, which holds the
 * secret, is dropped from React Query's cache as soon as nothing shows it. The list is not waited for: the caller's
 * onSuccess, which shows the secret, would otherwise wait for it too. When the API made it without the client or the
 * members option it was asked for (and the service revoked it), the config is read again: an API that cannot apply
 * the option stops offering it.
 */
export function useCreateEmbedCredential() {
	const queryClient = useQueryClient();
	const scope = useEmbedsScope();
	return useMutation<CreatedEmbedCredential, unknown, EmbedCredentialInput>({
		mutationFn: (input) => embedsService.createCredential(scope?.organizationId ?? '', input),
		gcTime: 0,
		meta: { handlesOwnError: true },
		onError: (error) => {
			const isOptionDropped =
				error instanceof EmbedClientNotLimitedError || error instanceof EmbedMembersNotAddedError;
			if (isOptionDropped) {
				void queryClient.invalidateQueries({ queryKey: EVERY_EMBEDS_CONFIG });
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: EVERY_CREDENTIALS_LIST });
		}
	});
}

/** Revokes a credential; it leaves the list at once and the list is read again. */
export function useRevokeEmbedCredential() {
	const queryClient = useQueryClient();
	return useMutation<void, unknown, string>({
		mutationFn: (id) => embedsService.revokeCredential(id),
		meta: { handlesOwnError: true },
		onSuccess: (_result, id) => {
			queryClient.setQueriesData<EmbedCredential[]>({ queryKey: EVERY_CREDENTIALS_LIST }, (rows) =>
				rows?.filter((row) => row.id !== id)
			);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: EVERY_CREDENTIALS_LIST })
	});
}
