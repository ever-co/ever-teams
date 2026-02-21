'use client';
import { activeTeamTaskState, allTaskStatisticsState, tasksByTeamState } from '@/core/stores';
import { getPublicState } from '@/core/stores/common/public';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import cloneDeep from 'lodash/cloneDeep';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../../queries/user-user.query';

/**
 * Resolves the active task for a given team member.
 *
 * Priority order:
 * 1. For the authenticated user: activeTeamTask (Jotai atom) — updated instantly on task change
 * 2. member.activeTaskId from API (set when timer starts/stops or task is selected)
 * 3. member.lastWorkedTask?.id from API (last task user worked on)
 * 4. Fallback: any task assigned to the member by userId
 *
 * Injects totalWorkedTime from allTaskStatisticsState into the resolved task.
 *
 * NOTE: This hook is a pure computation — it NEVER sets cookies or triggers side effects.
 * Cookie management is handled by setActiveTask in use-team-tasks-state.ts.
 *
 * @param member - The team member to resolve the active task for
 * @returns The resolved active task with totalWorkedTime injected, or null
 */
export function useMemberActiveTask(member: TOrganizationTeamEmployee | undefined): TTask | null {
	const { data: authUser } = useUserQuery();
	const tasks = useAtomValue(tasksByTeamState);
	const publicTeam = useAtomValue(getPublicState);
	const allTaskStatistics = useAtomValue(allTaskStatisticsState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const isAuthUser = member?.employee?.userId === authUser?.id;

	const memberTask = useMemo(() => {
		if (!member) {
			return null;
		}

		// For authenticated user, prioritize activeTeamTask (Jotai atom)
		// because it's updated instantly when changing tasks,
		// while member.activeTaskId waits for API response/React Query invalidation
		if (isAuthUser && activeTeamTask) {
			const responseTask = cloneDeep(activeTeamTask);
			const taskStatistics = allTaskStatistics.find((statistics) => statistics.id === responseTask.id);
			responseTask.totalWorkedTime = taskStatistics?.duration || 0;

			// NOTE: DO NOT set cookies here! This is a useMemo (pure computation).
			// Cookies are managed by setActiveTask in use-team-tasks-state.ts
			// Setting cookies here causes race conditions on page reload.

			return responseTask;
		}

		// For other members (or auth user with no activeTeamTask), use existing logic
		let cTask;
		let find;

		// Use member.activeTaskId from API for ALL members
		// This ensures each team has its own active task, not a global cookie
		let taskId: string | null = null;

		if (member.activeTaskId) {
			// Priority 1: activeTaskId from API (set when timer starts/stops or task is selected)
			taskId = member.activeTaskId;
		} else if (member.lastWorkedTask?.id) {
			// Priority 2: lastWorkedTask from API (last task user worked on)
			taskId = member.lastWorkedTask.id;
		}

		// Support for public teams: if publicTeam is true, allow any task to be displayed
		// Public teams are read-only and accessible without authentication via /team/[teamId]/[profileLink]
		if (taskId || publicTeam) {
			cTask = tasks.find((t) => t.id === taskId || publicTeam);
			find = publicTeam ? cTask : cTask?.members?.some((m) => m.id === member.employee?.id);
		}

		// Fallback: find any task assigned to the member
		if (!find) {
			cTask = tasks.find((t) => t.members?.some((m) => m.userId === member.employee?.userId));
			find = cTask?.members?.some((m) => m.id === member.employee?.id);
		}

		// NOTE: DO NOT set cookies here! This is a useMemo (pure computation).
		// Setting cookies in useMemo is an anti-pattern and causes race conditions.

		const responseTask = find ? cloneDeep(cTask) : null;

		if (responseTask) {
			const taskStatistics = allTaskStatistics.find((statistics) => statistics.id === responseTask.id);
			responseTask.totalWorkedTime = taskStatistics?.duration || 0;
		}

		return responseTask ?? null;
	}, [
		isAuthUser,
		activeTeamTask,
		member,
		member?.activeTaskId, // Force recalculation when activeTaskId changes
		member?.lastWorkedTask?.id, // Force recalculation when lastWorkedTask changes
		tasks,
		publicTeam,
		allTaskStatistics
	]);

	return memberTask;
}

