'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { userApiTokensService } from '@/core/services/client/api/users/user-api-tokens.service';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { userState } from '@/core/stores/user/user';
import type {
	TCreatedUserApiToken,
	TCreateUserApiTokenInput,
	TUserApiToken,
	TUserApiTokenConfig
} from '@/core/types/schemas/user/user-api-token.schema';

/**
 * Whether Settings → API tokens exists here:
 * - `loading`: the server has not answered yet;
 * - `enabled`: the server has the tokens on;
 * - `disabled`: the server has them off, or the API has no such routes at all (its 404);
 * - `error`: the question failed for another reason (offline, a 5xx): the page offers a retry.
 */
export type UserApiTokensAvailability = 'loading' | 'enabled' | 'disabled' | 'error';

/** Why a creation failed: ten working tokens already, the tokens turned off meanwhile, or anything else. */
export type UserApiTokenCreateFailure = 'LIMIT_REACHED' | 'DISABLED' | 'FAILED';

interface ConfigRead {
	status: 'pending' | 'success' | 'error';
	data: TUserApiTokenConfig | undefined;
	error: unknown;
}

/** Gauzy's refusal of an eleventh working token reads "You can hold 10 API tokens at once. ...". */
const LIMIT_MESSAGE_PATTERN = /tokens at once/i;

function messageOf(error: unknown): string {
	const message = (error as { message?: unknown } | null | undefined)?.message;
	if (typeof message === 'string') {
		return message;
	}
	return '';
}

export function userApiTokensAvailabilityOf(read: ConfigRead): UserApiTokensAvailability {
	if (read.status === 'success') {
		if (read.data?.enabled) {
			return 'enabled';
		}
		return 'disabled';
	}
	if (read.status === 'error') {
		if (errorStatusOf(read.error) === 404) {
			return 'disabled';
		}
		return 'error';
	}
	return 'loading';
}

/** Only a failure that may pass is worth asking again for: not a 4xx, which the next try would get again. */
export function shouldRetryConfig(failureCount: number, error: unknown): boolean {
	const status = errorStatusOf(error);
	const isClientRefusal = status !== null && status >= 400 && status < 500;
	if (isClientRefusal) {
		return false;
	}
	return failureCount < 2;
}

export function createFailureOf(error: unknown): UserApiTokenCreateFailure {
	const status = errorStatusOf(error);
	if (status === 404) {
		return 'DISABLED';
	}
	const isLimitRefusal = status === 400 && LIMIT_MESSAGE_PATTERN.test(messageOf(error));
	if (isLimitRefusal) {
		return 'LIMIT_REACHED';
	}
	return 'FAILED';
}

interface UserApiTokensScope {
	tenantId: string;
	userId: string;
}

function useUserApiTokensScope(): UserApiTokensScope | null {
	const user = useAtomValue(userState);
	const tenantId = user?.tenantId ?? null;
	const userId = user?.id ?? null;
	return useMemo(() => {
		if (!tenantId || !userId) {
			return null;
		}
		return { tenantId, userId };
	}, [tenantId, userId]);
}

/** Asks the server once per sign-in whether it has the tokens on: `GET /user-api-tokens/config`. */
export function useUserApiTokensAvailability() {
	const scope = useUserApiTokensScope();
	const query = useQuery({
		queryKey: queryKeys.userApiTokens.config(scope?.tenantId, scope?.userId),
		queryFn: ({ signal }) => userApiTokensService.readConfig(signal),
		enabled: scope !== null,
		staleTime: 5 * 60_000,
		retry: shouldRetryConfig
	});
	const availability = userApiTokensAvailabilityOf({ status: query.status, data: query.data, error: query.error });
	return { availability, retry: query.refetch };
}

const NO_TOKENS: TUserApiToken[] = [];

/** The person's tokens; asked only once the server said it has them on. */
export function useUserApiTokens(enabled: boolean) {
	const scope = useUserApiTokensScope();
	const query = useQuery({
		queryKey: queryKeys.userApiTokens.list(scope?.tenantId, scope?.userId),
		queryFn: ({ signal }) => userApiTokensService.list(signal),
		enabled: enabled && scope !== null,
		staleTime: 15_000
	});
	return {
		tokens: query.data ?? NO_TOKENS,
		isLoading: query.isPending && enabled,
		isError: query.isError,
		refetch: query.refetch
	};
}

/**
 * Creates a token; the list is read again so that the new token shows, without its secret. The answer, which holds the
 * secret, is dropped from React Query's cache as soon as nothing shows it.
 */
export function useCreateUserApiToken() {
	const queryClient = useQueryClient();
	const scope = useUserApiTokensScope();
	return useMutation<TCreatedUserApiToken, unknown, TCreateUserApiTokenInput>({
		mutationFn: (input) => userApiTokensService.create(input),
		gcTime: 0,
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.userApiTokens.list(scope?.tenantId, scope?.userId) })
	});
}

/** Revokes a token; it leaves the list at once and the list is read again. */
export function useRevokeUserApiToken() {
	const queryClient = useQueryClient();
	const scope = useUserApiTokensScope();
	const listKey = queryKeys.userApiTokens.list(scope?.tenantId, scope?.userId);
	return useMutation<void, unknown, string>({
		mutationFn: (id) => userApiTokensService.revoke(id),
		onSuccess: (_result, id) => {
			queryClient.setQueryData<TUserApiToken[]>(listKey, (tokens) => tokens?.filter((token) => token.id !== id));
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: listKey })
	});
}
