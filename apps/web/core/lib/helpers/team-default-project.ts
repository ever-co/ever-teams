type TeamWithProjects = {
	defaultProjectId?: string | null;
	projects?: { id?: string | null }[] | null;
};

/**
 * The project a team files its new tasks and time under: the one the team names, else, for a team created before
 * teams named one, its first project.
 */
export function teamDefaultProjectId(team: TeamWithProjects | null | undefined): string | null {
	if (!team) {
		return null;
	}
	if (team.defaultProjectId) {
		return team.defaultProjectId;
	}
	const firstProject = team.projects?.[0];
	return firstProject?.id ?? null;
}

/**
 * The project a timer start files its time under: the task's own, else the team's default project, so an
 * organization that requires a project still accepts the start of a task saved without one.
 */
export function timerStartProjectId(
	task: { projectId?: string | null } | null | undefined,
	team: TeamWithProjects | null | undefined
): string | null {
	const taskProjectId = task?.projectId;
	if (taskProjectId) {
		return taskProjectId;
	}
	return teamDefaultProjectId(team);
}

/** The task as a timer start files it, under the project `timerStartProjectId` picks, so its billable value follows. */
export function taskOnStartProject<T extends { projectId?: string | null }>(
	task: T | null | undefined,
	team: TeamWithProjects | null | undefined
): T | null {
	if (!task) {
		return null;
	}
	const projectId = timerStartProjectId(task, team);
	return { ...task, projectId };
}
