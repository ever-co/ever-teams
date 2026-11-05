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
