'use client';

import { useAtom, useAtomValue, useStore } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { choiceKeptForTask, timerBillableOf } from '@/core/lib/helpers/timer-billable';
import { queryKeys } from '@/core/query/keys';
import { activeTeamTaskState, timerBillableChoiceState, timerStatusState } from '@/core/stores';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

import { useOrganizationProjectsQuery } from '../organizations/projects/use-organization-projects-query';

const NO_PROJECTS: TOrganizationProject[] = [];

function displayedBillableOf(
	isRunning: boolean,
	runningLogBillable: boolean | null | undefined,
	pickedBillable: boolean
): boolean {
	if (!isRunning) {
		return pickedBillable;
	}
	if (typeof runningLogBillable !== 'boolean') {
		return pickedBillable;
	}
	return runningLogBillable;
}

/**
 * The billable value a start sends for a task, read when the start runs: the callers (every timer instance)
 * do not re-render with the projects list or the switch.
 */
export function useResolveTimerBillable() {
	const store = useStore();
	const queryClient = useQueryClient();

	return useCallback(
		(task: TTask | null | undefined) => {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();
			const projectsKey = queryKeys.organizationProjects.byScope(tenantId, organizationId);
			const projectsPage = queryClient.getQueryData<PaginationResponse<TOrganizationProject>>(projectsKey);
			const projects = projectsPage?.items ?? NO_PROJECTS;
			const choice = store.get(timerBillableChoiceState);
			return timerBillableOf(task, projects, choice);
		},
		[queryClient, store]
	);
}

export function useTimerBillable() {
	const activeTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(timerStatusState);
	const [choice, setChoice] = useAtom(timerBillableChoiceState);
	const { organizationProjects } = useOrganizationProjectsQuery({ enabled: false });

	const activeTaskId = activeTask?.id;
	const isTimerRunning = timerStatus?.running === true;
	const pickedBillable = timerBillableOf(activeTask, organizationProjects, choice);
	const runningLogBillable = timerStatus?.lastLog?.isBillable;
	const isBillable = displayedBillableOf(isTimerRunning, runningLogBillable, pickedBillable);
	const hasActiveTask = Boolean(activeTaskId);
	const isLocked = isTimerRunning || !hasActiveTask;

	useEffect(() => {
		if (!activeTaskId) {
			return;
		}
		setChoice((current) => choiceKeptForTask(current, activeTaskId));
	}, [activeTaskId, setChoice]);

	const setIsBillable = useCallback(
		(nextIsBillable: boolean) => {
			if (!activeTaskId) {
				return;
			}
			setChoice({ taskId: activeTaskId, isBillable: nextIsBillable });
		},
		[activeTaskId, setChoice]
	);

	return { isBillable, isLocked, setIsBillable };
}
