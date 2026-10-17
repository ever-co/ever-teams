/**
 * Reads the team and project that a metadata list request (statuses, sizes, versions, issue types) is scoped to,
 * from the same query params the client sends to Gauzy in direct mode. Tenant and organization stay with the guard.
 * Without a team, `organizationTeamId` is null; `projectId` is only set when the client sends one.
 */
export function getTeamProjectScope(req: Request): { organizationTeamId: string | null; projectId?: string } {
	const { searchParams } = new URL(req.url);
	const organizationTeamId = searchParams.get('organizationTeamId') || null;
	const projectId = searchParams.get('projectId') || null;

	return { organizationTeamId, ...(projectId !== null ? { projectId } : {}) };
}
