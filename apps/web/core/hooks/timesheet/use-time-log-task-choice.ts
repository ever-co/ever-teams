'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
	type EntryTaskChange,
	entryProjectIdOf,
	entryTaskChangeOf,
	findProject,
	isEntryOfListedTeam,
	projectChoicesFor,
	taskChoicesOfEntry
} from '@/core/lib/utils/dashboards/time-entry-task';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';

const NO_PROJECTS: TOrganizationProject[] = [];

const NO_CHANGE: Partial<EntryTaskChange> = {};

type EntryProject = NonNullable<ITimeLog['project']>;

/** The project the dialog shows: the listed one, or the entry's own while the list does not hold it. */
function shownProjectOf(
	projectId: string,
	listedProject: TOrganizationProject | undefined,
	entryProject: EntryProject | undefined
): TOrganizationProject | EntryProject | null {
	if (listedProject) {
		return listedProject;
	}
	const isEntryProject = entryProject?.id === projectId;
	if (entryProject && isEntryProject) {
		return entryProject;
	}
	return null;
}

interface TaskPick {
	logId: string;
	taskId: string;
}

/** The task picked for this entry: a pick made on another entry, in a dialog that stays mounted, does not count. */
function pickedTaskIdFor(pick: TaskPick | null, logId: string): string | null {
	if (!pick) {
		return null;
	}
	if (pick.logId !== logId) {
		return null;
	}
	return pick.taskId;
}

export interface TimeLogTaskChoiceInput {
	log: ITimeLog;
	projects: TOrganizationProject[] | undefined;
	/** The project the dialog holds for the entry: its own, or the one picked by hand. */
	pickedProjectId: string;
}

/**
 * The task of a time entry being edited: the team's tasks it may move to, and what the move does to its project. A
 * task with a project takes the entry with it, so that project is the only one the dialog offers and the update
 * sends it; a task without one leaves the entry under the project the dialog holds.
 */
export function useTimeLogTaskChoice(input: TimeLogTaskChoiceInput) {
	const { log, pickedProjectId } = input;
	const projects = input.projects ?? NO_PROJECTS;
	const activeTeam = useAtomValue(activeTeamState);
	const teamTasks = useAtomValue(tasksByTeamState);
	const [pick, setPick] = useState<TaskPick | null>(null);
	const pickedTaskId = pickedTaskIdFor(pick, log.id);
	const pickTask = useCallback((taskId: string) => setPick({ logId: log.id, taskId }), [log.id]);

	const entryTask = log.task;
	const entryTaskId = log.taskId ?? entryTask?.id ?? null;
	const canChangeTask = isEntryOfListedTeam(log.organizationTeamId, activeTeam?.id);
	const taskChoices = useMemo(() => taskChoicesOfEntry(entryTask, teamTasks), [entryTask, teamTasks]);
	const pickedTask = taskChoices.find((task) => task.id === pickedTaskId);
	const change = useMemo(
		() => entryTaskChangeOf(entryTaskId, pickedTask, pickedProjectId),
		[entryTaskId, pickedProjectId, pickedTask]
	);

	let newTask: typeof pickedTask;
	if (change) {
		newTask = pickedTask;
	}
	const newTaskProjectId = newTask?.projectId;
	const newTaskProject = findProject(newTaskProjectId, projects);
	const projectChoices = useMemo(
		() => projectChoicesFor(newTaskProjectId, newTaskProject, projects),
		[newTaskProject, newTaskProjectId, projects]
	);

	const shownProjectId = entryProjectIdOf(newTask, pickedProjectId);
	const listedProject = findProject(shownProjectId, projects);
	const shownProject = shownProjectOf(shownProjectId, listedProject, log.project);
	const shownTaskId = pickedTaskId ?? entryTaskId;

	return {
		canChangeTask,
		taskChoices,
		taskId: shownTaskId ?? '',
		pickTask,
		/** What the update sends on top of the dialog's own fields: nothing while the task is the entry's own. */
		changedFields: change ?? NO_CHANGE,
		projectChoices,
		shownProject,
		/** The project the entry moves to with its new task, when the dialog knows its name. */
		followedProjectName: newTaskProject?.name ?? null
	};
}

export type TimeLogTaskChoice = ReturnType<typeof useTimeLogTaskChoice>;
