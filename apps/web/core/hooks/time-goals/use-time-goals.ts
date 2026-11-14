'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { activeGoalsOf, archivedGoalsOf, isGoalsUnavailableError } from '@/core/lib/utils/time-goals';
import { queryKeys } from '@/core/query/keys';
import { timeGoalService } from '@/core/services/client/api/timesheets/time-goal.service';
import type {
	ITimeGoal,
	ITimeGoalCreateInput,
	ITimeGoalProgress,
	ITimeGoalUpdateInput
} from '@/core/types/interfaces/timesheet/time-goal';

const NO_GOALS: ITimeGoal[] = [];

const NO_PROGRESS: ITimeGoalProgress[] = [];

/** Goals change by hand, a few times a week: a minute keeps the sidebar and the pages from asking on each visit. */
const GOALS_STALE_MS = 60_000;

/** Progress grows with each tracked minute; a running timer counts up to the read, so a page reads it again. */
const PROGRESS_REFRESH_MS = 60_000;

/**
 * Whether the platform serves time goals: `unknown` until the list answers, `unavailable` where it answers 404 (a
 * platform without ever-co/ever-gauzy#11918), and the page, the sidebar entry and the My week block then stay away.
 */
export type TimeGoalsAvailability = 'unknown' | 'available' | 'unavailable';

/** A platform without goals (404) and a refusal (403) are answers, not failures: asked once. */
function retriesGoalRead(failureCount: number, error: unknown) {
	const status = errorStatusOf(error);
	const isAnswer = status === 403 || isGoalsUnavailableError(error);
	return !isAnswer && failureCount < 2;
}

function useGoalScope() {
	const { data: user } = useUserQuery();
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const userId = user?.id ?? null;
	const hasScope = Boolean(tenantId) && Boolean(organizationId) && Boolean(userId);
	return { tenantId, organizationId, userId, hasScope };
}

/**
 * The goals the signed-in person may read in the organization, archived ones included (the page splits them). One
 * cache for the Goals page, the sidebar entry and My week.
 */
export function useTimeGoals({ enabled = true }: { enabled?: boolean } = {}) {
	const { tenantId, organizationId, userId, hasScope } = useGoalScope();
	const query = useQuery({
		queryKey: queryKeys.timeGoals.list(tenantId, organizationId, userId),
		queryFn: ({ signal }) => timeGoalService.list({ includeArchived: true }, signal),
		enabled: enabled && hasScope,
		staleTime: GOALS_STALE_MS,
		retry: retriesGoalRead
	});

	const items = query.data?.items ?? NO_GOALS;
	const activeGoals = useMemo(() => activeGoalsOf(items), [items]);
	const archivedGoals = useMemo(() => archivedGoalsOf(items), [items]);

	let availability: TimeGoalsAvailability = 'unknown';
	if (query.data) {
		availability = 'available';
	} else if (isGoalsUnavailableError(query.error)) {
		availability = 'unavailable';
	}

	const refetch = query.refetch;
	const retry = useCallback(() => {
		void refetch();
	}, [refetch]);

	return {
		activeGoals,
		archivedGoals,
		availability,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError && availability !== 'unavailable',
		retry
	};
}

/**
 * Where the signed-in person stands today against every goal that counts them (their own, their teams', the
 * organization's) or, with a team, where each member of it they may read stands. The platform counts each member's
 * period in their own time zone.
 */
export function useTimeGoalProgress({ teamId = null, enabled = true }: { teamId?: string | null; enabled?: boolean }) {
	const { tenantId, organizationId, userId, hasScope } = useGoalScope();
	const query = useQuery({
		queryKey: queryKeys.timeGoals.progress(tenantId, organizationId, userId, teamId),
		queryFn: ({ signal }) => {
			if (teamId) {
				return timeGoalService.progress({ organizationTeamId: teamId }, signal);
			}
			return timeGoalService.progress({}, signal);
		},
		enabled: enabled && hasScope,
		refetchInterval: PROGRESS_REFRESH_MS,
		retry: retriesGoalRead
	});

	const refetch = query.refetch;
	const retry = useCallback(() => {
		void refetch();
	}, [refetch]);

	return {
		rows: query.data ?? NO_PROGRESS,
		hasData: query.data !== undefined,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError && query.data === undefined,
		isUpdating: query.isFetching && query.data !== undefined,
		retry
	};
}

/** One write to a goal. */
export type TimeGoalWrite =
	| { kind: 'create'; input: ITimeGoalCreateInput }
	| { kind: 'update'; goalId: string; input: ITimeGoalUpdateInput }
	| { kind: 'archive' | 'restore'; goalId: string };

function send(write: TimeGoalWrite): Promise<ITimeGoal> {
	switch (write.kind) {
		case 'create':
			return timeGoalService.create(write.input);
		case 'update':
			return timeGoalService.update(write.goalId, write.input);
		case 'archive':
			return timeGoalService.archive(write.goalId);
		case 'restore':
			return timeGoalService.restore(write.goalId);
	}
}

/** Creates, changes, archives and restores goals; every goal read is asked again once the platform answers. */
export function useTimeGoalWrites() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: send,
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.timeGoals.all })
	});
	return { write: mutation.mutateAsync, isWriting: mutation.isPending };
}
