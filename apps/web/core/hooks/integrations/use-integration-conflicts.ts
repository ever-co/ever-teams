'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conflictResolveRefusalOf, type ConflictResolveRefusal } from '@/core/lib/utils/integration-sync-conflicts';
import { queryKeys } from '@/core/query/keys';
import { asanaIntegrationService } from '@/core/services/client/api/integrations/asana.service';
import { linearIntegrationService } from '@/core/services/client/api/integrations/linear.service';
import { trelloIntegrationService } from '@/core/services/client/api/integrations/trello.service';
import { activeTeamState, teamTasksState } from '@/core/stores';
import type {
	IIntegrationConflictQuery,
	IIntegrationSyncConflict,
	TIntegrationConflictKeep,
	TIntegrationConflictProvider,
	TIntegrationConflictStatus
} from '@/core/types/interfaces/integrations/integration-sync-conflict';

/** The conflict routes of a provider's client (the three serve the same shapes). */
export interface IntegrationConflictClient {
	conflicts: (
		integrationId: string,
		query?: IIntegrationConflictQuery,
		signal?: AbortSignal
	) => Promise<IIntegrationSyncConflict[]>;
	resolveConflict: (
		integrationId: string,
		conflictId: string,
		keep: TIntegrationConflictKeep
	) => Promise<IIntegrationSyncConflict>;
}

const CLIENTS: Record<TIntegrationConflictProvider, IntegrationConflictClient> = {
	linear: linearIntegrationService,
	asana: asanaIntegrationService,
	trello: trelloIntegrationService
};

/** How many conflicts the list reads (the platform's own default page), and how many more "Show more" adds, up to the route's limit. */
export const CONFLICTS_PAGE = 50;
export const CONFLICTS_MAX = 200;
const NO_CONFLICTS: IIntegrationSyncConflict[] = [];

export interface IntegrationConflictsOptions {
	provider: TIntegrationConflictProvider;
	/** The connection; nothing is read without one. */
	integrationId: string | null;
	status: TIntegrationConflictStatus;
	/** Only what this run found; null: every run. */
	runId: string | null;
}

/** A refused resolve: why, and the error itself (its reason for anything but a stale or a gone conflict). */
export interface IntegrationConflictResolveError {
	refusal: ConflictResolveRefusal;
	error: unknown;
}

export interface IntegrationConflicts {
	conflicts: IIntegrationSyncConflict[];
	/** Whether the platform may hold more than the list read (a full page, below the route's limit). */
	canShowMore: boolean;
	/** Reads a longer list (older conflicts come up). */
	showMore: () => void;
	isLoading: boolean;
	readError: unknown;
	isRetrying: boolean;
	retry: () => void;
	/** The task's title when the app holds it (the team's tasks, or a title conflict's applied value), else null. */
	titleOf: (conflict: IIntegrationSyncConflict) => string | null;
	/** The conflict being resolved (one at a time). */
	resolvingId: string | null;
	resolve: (conflictId: string, keep: TIntegrationConflictKeep) => Promise<void>;
	/** What the last resolve kept (the notice), or null. */
	resolved: TIntegrationConflictKeep | null;
	resolveError: IntegrationConflictResolveError | null;
	clearFeedback: () => void;
}

/**
 * The sync conflicts of a Linear, Asana or Trello connection (`GET …/conflicts`) and their resolution
 * (`POST …/conflicts/:id/resolve`, `keep: external | platform`). A resolved conflict leaves the open list at once and
 * every list of the provider is read again; a conflict resolved elsewhere (404) reads them again too, and a task that
 * changed since (409) keeps its conflict.
 */
export function useIntegrationConflicts({
	provider,
	integrationId,
	status,
	runId
}: IntegrationConflictsOptions): IntegrationConflicts {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const teamTasks = useAtomValue(teamTasksState);
	const tenantId = activeTeam?.tenantId ?? null;
	const organizationId = activeTeam?.organizationId ?? null;
	const client = CLIENTS[provider];
	const keys = queryKeys.integrations[provider];
	// How far the list reaches; another list (connection, status or run) starts from its newest page again.
	const listIdentity = `${provider}:${integrationId ?? ''}:${status}:${runId ?? ''}`;
	const [extent, setExtent] = useState({ identity: listIdentity, take: CONFLICTS_PAGE });
	const take = extent.identity === listIdentity ? extent.take : CONFLICTS_PAGE;
	const listKey = useMemo(
		() => [...keys.conflicts(tenantId, organizationId, integrationId, status, runId), take] as const,
		[integrationId, keys, organizationId, runId, status, take, tenantId]
	);
	const [resolvingId, setResolvingId] = useState<string | null>(null);
	const [resolved, setResolved] = useState<TIntegrationConflictKeep | null>(null);
	const [resolveError, setResolveError] = useState<IntegrationConflictResolveError | null>(null);

	const listQuery = useQuery({
		queryKey: listKey,
		queryFn: ({ signal }) => client.conflicts(integrationId as string, { status, runId, take }, signal),
		enabled: !!integrationId,
		staleTime: 15_000,
		// While a longer list is read, the shorter one stays on screen.
		placeholderData: (previous) => previous
	});
	const conflicts = listQuery.data ?? NO_CONFLICTS;
	const canShowMore = conflicts.length >= take && take < CONFLICTS_MAX;
	const showMore = useCallback(
		() => setExtent({ identity: listIdentity, take: Math.min(take + CONFLICTS_PAGE, CONFLICTS_MAX) }),
		[listIdentity, take]
	);

	const titles = useMemo(() => {
		const byId = new Map<string, string>();
		for (const task of teamTasks) {
			const title = typeof task?.title === 'string' ? task.title.trim() : '';
			if (task?.id && title) byId.set(task.id, title);
		}
		return byId;
	}, [teamTasks]);

	const titleOf = useCallback(
		(conflict: IIntegrationSyncConflict) => {
			const known = titles.get(conflict.taskId);
			if (known) return known;
			// A title conflict: the provider's value is the task's title now.
			const applied = conflict.field === 'title' ? conflict.externalValue?.trim() : '';
			return applied || null;
		},
		[titles]
	);

	const resolve = useCallback(
		async (conflictId: string, keep: TIntegrationConflictKeep) => {
			if (!integrationId || resolvingId) return;
			setResolvingId(conflictId);
			setResolved(null);
			setResolveError(null);
			try {
				await client.resolveConflict(integrationId, conflictId, keep);
				queryClient.setQueryData<IIntegrationSyncConflict[]>(listKey, (current) =>
					current?.filter((conflict) => conflict.id !== conflictId)
				);
				setResolved(keep);
				void queryClient.invalidateQueries({ queryKey: keys.conflictsAll });
			} catch (error) {
				const refusal = conflictResolveRefusalOf(error);
				setResolveError({ refusal, error });
				if (refusal === 'notFound') void queryClient.invalidateQueries({ queryKey: keys.conflictsAll });
			} finally {
				setResolvingId(null);
			}
		},
		[client, integrationId, keys.conflictsAll, listKey, queryClient, resolvingId]
	);

	const clearFeedback = useCallback(() => {
		setResolved(null);
		setResolveError(null);
	}, []);

	const retry = useCallback(() => {
		void listQuery.refetch();
	}, [listQuery]);

	return {
		conflicts,
		canShowMore,
		showMore,
		isLoading: !!integrationId && listQuery.isPending,
		readError: listQuery.error,
		isRetrying: listQuery.isFetching,
		retry,
		titleOf,
		resolvingId,
		resolve,
		resolved,
		resolveError,
		clearFeedback
	};
}

/**
 * Reads a provider's conflict lists again when one of its runs finishes, while others may still run (a finished
 * import or sync may have found conflicts): the runs' poll refreshes the runs alone.
 */
export function useConflictsAfterRuns(
	provider: TIntegrationConflictProvider,
	runs: readonly { id: string; status: string }[]
): void {
	const queryClient = useQueryClient();
	const running = useRef(new Set<string>());
	useEffect(() => {
		const now = new Set(runs.filter((run) => run.status === 'running').map((run) => run.id));
		const finished = [...running.current].some((id) => !now.has(id));
		running.current = now;
		if (finished) void queryClient.invalidateQueries({ queryKey: queryKeys.integrations[provider].conflictsAll });
	}, [provider, queryClient, runs]);
}
