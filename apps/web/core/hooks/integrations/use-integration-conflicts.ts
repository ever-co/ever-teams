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
	// The resolve in flight, by request: only the request that set it clears it (another connection's may still run).
	const [pending, setPending] = useState<{
		request: number;
		integrationId: string | null;
		conflictId: string | null;
	}>({
		request: 0,
		integrationId: null,
		conflictId: null
	});
	const lastRequest = useRef(0);
	// What the last resolve did, for the connection it was made on: another connection shows none of it.
	const [feedback, setFeedback] = useState<{
		integrationId: string | null;
		resolved: TIntegrationConflictKeep | null;
		resolveError: IntegrationConflictResolveError | null;
	}>({ integrationId: null, resolved: null, resolveError: null });
	const resolvingId = pending.integrationId === integrationId ? pending.conflictId : null;
	const resolved = feedback.integrationId === integrationId ? feedback.resolved : null;
	const resolveError = feedback.integrationId === integrationId ? feedback.resolveError : null;

	const listQuery = useQuery({
		queryKey: listKey,
		queryFn: ({ signal }) => client.conflicts(integrationId as string, { status, runId, take }, signal),
		enabled: !!integrationId,
		staleTime: 15_000,
		// While a longer page of the same list is read, the shorter one stays on screen; another list (connection,
		// status or run) never shows the last one's rows.
		placeholderData: (previous, previousQuery) =>
			previousQuery && sameListBesidesTake(previousQuery.queryKey, listKey) ? previous : undefined
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
			const request = ++lastRequest.current;
			// Only the newest resolve speaks: an older one (of another connection) finishing late says nothing.
			const isLatest = () => request === lastRequest.current;
			setPending({ request, integrationId, conflictId });
			setFeedback({ integrationId, resolved: null, resolveError: null });
			try {
				await client.resolveConflict(integrationId, conflictId, keep);
				queryClient.setQueryData<IIntegrationSyncConflict[]>(listKey, (current) =>
					current?.filter((conflict) => conflict.id !== conflictId)
				);
				if (isLatest()) setFeedback({ integrationId, resolved: keep, resolveError: null });
				void queryClient.invalidateQueries({ queryKey: keys.conflictsAll });
				// The task's value was written back: the task lists and the task are read again.
				if (keep === 'platform') void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
			} catch (error) {
				const refusal = conflictResolveRefusalOf(error);
				if (isLatest()) setFeedback({ integrationId, resolved: null, resolveError: { refusal, error } });
				if (refusal === 'notFound') void queryClient.invalidateQueries({ queryKey: keys.conflictsAll });
			} finally {
				setPending((current) =>
					current.request === request ? { request, integrationId: null, conflictId: null } : current
				);
			}
		},
		[client, integrationId, keys.conflictsAll, listKey, queryClient, resolvingId]
	);

	const clearFeedback = useCallback(() => {
		setFeedback({ integrationId: null, resolved: null, resolveError: null });
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

/** Whether two conflict list keys name the same list, whatever page size (their last member) each reads. */
export function sameListBesidesTake(a: readonly unknown[], b: readonly unknown[]): boolean {
	return a.length === b.length && a.slice(0, -1).every((member, index) => member === b[index]);
}

/** What a run of the runs list says about conflicts. */
export interface ConflictRunState {
	id: string;
	status: string;
	conflictCount?: number;
}

/**
 * Whether the newer runs read holds a run that finished since the older one: one that was running and is not any
 * more (or left the list), or one first seen already finished with conflicts (it started and ended between reads).
 */
export function runsFinishedSince(
	before: readonly ConflictRunState[] | null,
	after: readonly ConflictRunState[]
): boolean {
	if (!before) return false;
	const earlier = new Set(before.map((run) => run.id));
	const now = new Map(after.map((run) => [run.id, run.status]));
	if (before.some((run) => run.status === 'running' && now.get(run.id) !== 'running')) return true;
	return after.some((run) => !earlier.has(run.id) && run.status !== 'running' && (run.conflictCount ?? 0) > 0);
}

/**
 * Reads a provider's conflict lists again when one of its runs finishes, while others may still run (a finished
 * import or sync may have found conflicts): the runs' poll refreshes the runs alone.
 */
export function useConflictsAfterRuns(provider: TIntegrationConflictProvider, runs: readonly ConflictRunState[]): void {
	const queryClient = useQueryClient();
	// The runs of the last read; null until the first (the lists read then on their own).
	const previous = useRef<readonly ConflictRunState[] | null>(null);
	useEffect(() => {
		const finished = runsFinishedSince(previous.current, runs);
		previous.current = runs;
		if (finished) void queryClient.invalidateQueries({ queryKey: queryKeys.integrations[provider].conflictsAll });
	}, [provider, queryClient, runs]);
}
