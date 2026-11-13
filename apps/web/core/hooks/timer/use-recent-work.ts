'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { lastDaysScopeOf, memberTimeLogsQueryOf } from '@/core/hooks/timesheet/member-time-logs-query';
import { RECENT_WORK_DAYS, recentTasksOf, tasksByIdOf } from '@/core/lib/utils/time-entry-reuse';
import { teamTasksState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const STALE_TIME = 1000 * 60 * 3;

const NO_LOGS: ITimeLog[] = [];

/**
 * The tasks the signed-in member tracked last, for the timer's task picker: their own entries of the last days in
 * one request, kept to the tasks the active team still lists. Nothing is read for a user who is not an employee.
 */
export function useRecentWork() {
	const { data: user } = useUserQuery();
	const teamTasks = useAtomValue(teamTasksState);

	const employeeId = user?.employee?.id ?? '';
	const workspace = { tenantId: user?.tenantId, organizationId: user?.employee?.organizationId };
	const scope = lastDaysScopeOf(workspace, employeeId, new Date(), RECENT_WORK_DAYS);
	const hasEmployee = Boolean(employeeId);
	const hasWorkspace = Boolean(scope.tenantId) && Boolean(scope.organizationId);
	const isReady = hasEmployee && hasWorkspace;

	const query = useQuery({ ...memberTimeLogsQueryOf(scope), enabled: isReady, staleTime: STALE_TIME });

	const logs = query.data ?? NO_LOGS;
	const reachableTasks = useMemo(() => tasksByIdOf(teamTasks), [teamTasks]);
	const recentTasks = useMemo(() => recentTasksOf(logs, reachableTasks), [logs, reachableTasks]);

	const hasData = query.data !== undefined;
	const isLoading = isReady && query.isPending;
	const isError = query.isError && !hasData;

	return { recentTasks, isLoading, isError, retry: query.refetch };
}
