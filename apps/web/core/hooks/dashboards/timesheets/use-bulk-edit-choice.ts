'use client';

import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { findProject } from '@/core/lib/utils/dashboards/time-entry-task';
import {
	type BulkEditChoice,
	handPickedProjectIdOf,
	taskChoicesUnderProject
} from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';

/**
 * What the bulk edit dialog holds in its three fields, each on "Keep as is" (null) until picked, and what each
 * field offers. A task with a project of its own takes the project field with it; a project picked by hand
 * narrows the tasks to the ones an entry can keep under it.
 */
export function useBulkEditChoice() {
	const activeTeam = useAtomValue(activeTeamState);
	const teamTasks = useAtomValue(tasksByTeamState);
	const projectsQuery = useOrganizationProjectsQuery();
	const projects = projectsQuery.organizationProjects;
	const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
	const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
	const [isBillable, setIsBillable] = useState<boolean | null>(null);

	// A pick whose task or project left the lists (a team switch in another tab) no longer counts
	const pickedTask = useMemo(
		() => teamTasks.find((task) => task.id === pickedTaskId) ?? null,
		[pickedTaskId, teamTasks]
	);
	const pickedProject = findProject(pickedProjectId, projects) ?? null;
	const listedProjectId = pickedProject?.id ?? null;

	const choice = useMemo<BulkEditChoice>(
		() => ({ projectId: listedProjectId, task: pickedTask, isBillable }),
		[isBillable, listedProjectId, pickedTask]
	);

	const handPickedProjectId = handPickedProjectIdOf(choice);
	const taskChoices = useMemo(
		() => taskChoicesUnderProject(teamTasks, handPickedProjectId),
		[handPickedProjectId, teamTasks]
	);
	const taskProjectId = pickedTask?.projectId ?? null;
	const taskProject = findProject(taskProjectId, projects);
	const isTaskListNarrowed = Boolean(handPickedProjectId);
	let narrowingProjectName: string | null = null;
	if (isTaskListNarrowed) {
		narrowingProjectName = pickedProject?.name ?? null;
	}

	return {
		choice,
		listedTeamId: activeTeam?.id,
		project: {
			pickedId: listedProjectId,
			choices: projects,
			pick: setPickedProjectId,
			/** The picked task has a project of its own: the entries go to it, and no other can be picked. */
			followsTask: Boolean(taskProjectId),
			followedProject: taskProject ?? null,
			isLoading: projectsQuery.getOrganizationProjectsLoading,
			hasFailed: projectsQuery.isOrganizationProjectsError,
			retry: projectsQuery.refetchOrganizationProjects
		},
		task: {
			pickedId: pickedTask?.id ?? null,
			pickedTask,
			choices: taskChoices,
			pick: setPickedTaskId,
			/** The project whose tasks the list is narrowed to, when one was picked by hand. */
			narrowingProjectName
		},
		billable: { value: isBillable, pick: setIsBillable }
	};
}

export type BulkEditChoiceState = ReturnType<typeof useBulkEditChoice>;
