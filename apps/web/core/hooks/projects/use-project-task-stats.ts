'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState, tasksByTeamState, teamTasksCompleteState } from '@/core/stores';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { buildProjectTaskStats, type ProjectTaskStats } from '@/core/lib/utils/project-list';

export interface ProjectTaskStatsState {
	/** False while the shell still loads the team's task pages, or when no team is selected: no figure is shown then. */
	isReady: boolean;
	hasTeam: boolean;
	teamName: string | null;
	statsOf: (projectId: string) => ProjectTaskStats | undefined;
}

/** Gauzy returns the team's tasks (`/tasks/team`), so every figure is the active team's view of a project. */
export function useProjectTaskStats(): ProjectTaskStatsState {
	const tasks = useAtomValue(tasksByTeamState);
	const tasksComplete = useAtomValue(teamTasksCompleteState);
	const activeTeam = useAtomValue(activeTeamState);
	const { taskStatuses } = useTaskStatusesQuery();

	const statsByProject = useMemo(() => buildProjectTaskStats(tasks, taskStatuses), [tasks, taskStatuses]);

	const hasTeam = Boolean(activeTeam?.id);
	const isReady = hasTeam && tasksComplete;
	const teamName = activeTeam?.name ?? null;

	return useMemo(
		() => ({
			isReady,
			hasTeam,
			teamName,
			statsOf: (projectId: string) => statsByProject.get(projectId)
		}),
		[hasTeam, isReady, statsByProject, teamName]
	);
}
