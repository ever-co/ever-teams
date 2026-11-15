'use client';

import { useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { shellSettledState } from '@/core/stores/common/shell';
import { sharedReportLinkTokensState } from '@/core/stores/timer/saved-report-links';
import { savedReportService } from '@/core/services/client/api/timesheets/saved-report.service';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import type {
	ISavedReport,
	ISavedReportInput,
	ISavedReportShareResponse
} from '@/core/types/interfaces/timesheet/saved-report';

/**
 * What the report page can offer: `ready` (the list is read), `unsupported` (an API without saved reports answers 404:
 * no Save, no Share, the page works as before), `error` (the menu says so and offers to try again) or `loading`.
 */
export type SavedReportsAvailability = 'loading' | 'ready' | 'unsupported' | 'error';

const NOT_FOUND = 404;

function availabilityOf(isSuccess: boolean, isError: boolean, error: unknown): SavedReportsAvailability {
	if (isSuccess) {
		return 'ready';
	}
	if (!isError) {
		return 'loading';
	}
	if (errorStatusOf(error) === NOT_FOUND) {
		return 'unsupported';
	}
	return 'error';
}

function shouldRetryList(failureCount: number, error: unknown) {
	const status = errorStatusOf(error);
	const isRefusal = status !== null && status < 500;
	if (isRefusal) {
		return false;
	}
	return failureCount < 2;
}

export interface SavedReportsScope {
	tenantId: string | null | undefined;
	organizationId: string | null | undefined;
	userId: string | null | undefined;
}

/** The signed-in member's saved reports of the active organization, and the writes that change them. */
export function useSavedReports(scope: SavedReportsScope) {
	const queryClient = useQueryClient();
	const { tenantId, organizationId, userId } = scope;
	const hasScope = Boolean(tenantId) && Boolean(organizationId) && Boolean(userId);
	// Nothing on the report's first screen waits for the list (its buttons show once it is read): it is asked once the
	// shell has settled (shell.ts), so a cold visit asks Gauzy nothing more before the shell is ready
	const shellSettled = useAtomValue(shellSettledState);
	const listKey = queryKeys.savedReports.list(tenantId, organizationId, userId);
	const query = useQuery({
		queryKey: listKey,
		queryFn: () => savedReportService.list(organizationId ?? ''),
		enabled: hasScope && shellSettled,
		staleTime: 60_000,
		retry: shouldRetryList
	});
	const [linkTokens, setLinkTokens] = useAtom(sharedReportLinkTokensState);

	const reports = useMemo<ISavedReport[]>(() => query.data?.items ?? [], [query.data]);
	const availability = availabilityOf(query.isSuccess, query.isError, query.error);
	const readAgain = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.savedReports.all }),
		[queryClient]
	);

	const keepToken = useCallback(
		(id: string, response: ISavedReportShareResponse) => {
			setLinkTokens((tokens) => ({ ...tokens, [id]: response.token }));
		},
		[setLinkTokens]
	);

	const forgetToken = useCallback(
		(id: string) => {
			setLinkTokens((tokens) => {
				const kept = { ...tokens };
				delete kept[id];
				return kept;
			});
		},
		[setLinkTokens]
	);

	const create = useMutation({
		mutationFn: (input: ISavedReportInput) =>
			savedReportService.create({ ...input, tenantId: tenantId ?? '', organizationId: organizationId ?? '' }),
		onSuccess: readAgain
	});

	const update = useMutation({
		mutationFn: ({ id, input }: { id: string; input: Partial<ISavedReportInput> }) =>
			savedReportService.update(id, input),
		onSuccess: readAgain
	});

	const remove = useMutation({
		mutationFn: (id: string) => savedReportService.remove(id),
		onSuccess: (_data, id) => {
			forgetToken(id);
			return readAgain();
		}
	});

	const share = useMutation({
		mutationFn: ({ id, expiresAt }: { id: string; expiresAt: string | null }) =>
			savedReportService.share(id, { expiresAt }),
		onSuccess: (response, { id }) => {
			keepToken(id, response);
			return readAgain();
		},
		gcTime: 0
	});

	const unshare = useMutation({
		mutationFn: (id: string) => savedReportService.unshare(id),
		onSuccess: (_data, id) => {
			forgetToken(id);
			return readAgain();
		}
	});

	return {
		reports,
		availability,
		isLoading: query.isLoading,
		retry: query.refetch,
		linkTokens,
		create,
		update,
		remove,
		share,
		unshare
	};
}

export type SavedReports = ReturnType<typeof useSavedReports>;
