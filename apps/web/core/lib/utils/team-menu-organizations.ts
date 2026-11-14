import type { TOrganizationTeam } from '@/core/types/schemas';

/** An organization of the workspace as the team menu shows it. */
export interface ITeamMenuOrganization {
	id: string;
	name: string;
	/** The person's teams there, when the API lists them to this person (see `teamsListed`). */
	teams: TOrganizationTeam[];
	/**
	 * False when Gauzy keeps the person inside the organization of their session (every role but the workspace's
	 * admins): its teams are read once the person has switched to it.
	 */
	teamsListed: boolean;
}

/** The person's organizations of the workspace, the current one apart, as the team menu groups them. */
export interface ITeamMenuOrganizations {
	current: { id: string; name: string } | null;
	others: ITeamMenuOrganization[];
}

/** The part of a membership (`/user-organization` with its `organization` relation) the menu reads. */
export interface ITeamMenuMembership {
	organizationId?: string | null;
	isActive?: boolean | null;
	isArchived?: boolean | null;
	organization?: { id?: string | null; name?: string | null } | null;
}

/** The organization a membership names, when it is an active one with an id. */
function organizationOf(membership: ITeamMenuMembership): { id: string; name: string } | null {
	const id = membership.organizationId || membership.organization?.id;
	const isInactive = membership.isActive === false;
	const isArchived = membership.isArchived === true;
	if (!id || isInactive || isArchived) {
		return null;
	}
	return { id, name: membership.organization?.name?.trim() || '' };
}

/**
 * Splits the person's memberships into the current organization and the others, each organization once, the others
 * by name. An organization without a name keeps its place at the end rather than disappearing.
 */
export function teamMenuOrganizationsOf(
	memberships: readonly ITeamMenuMembership[],
	currentOrganizationId: string | null | undefined
): { current: { id: string; name: string } | null; others: { id: string; name: string }[] } {
	const seen = new Set<string>();
	let current: { id: string; name: string } | null = null;
	const others: { id: string; name: string }[] = [];
	for (const membership of memberships) {
		const organization = organizationOf(membership);
		if (!organization || seen.has(organization.id)) {
			continue;
		}
		seen.add(organization.id);
		if (organization.id === currentOrganizationId) {
			current = organization;
			continue;
		}
		others.push(organization);
	}
	others.sort(byNameThenUnnamedLast);
	return { current, others };
}

function byNameThenUnnamedLast(left: { name: string }, right: { name: string }): number {
	const leftUnnamed = left.name === '';
	const rightUnnamed = right.name === '';
	const onlyLeftUnnamed = leftUnnamed && !rightUnnamed;
	if (onlyLeftUnnamed) {
		return 1;
	}
	const onlyRightUnnamed = rightUnnamed && !leftUnnamed;
	if (onlyRightUnnamed) {
		return -1;
	}
	return left.name.localeCompare(right.name);
}

/**
 * The other organizations with their teams. `teamsByOrganization` holds the teams read for an organization; one
 * missing from it (not read, or refused) is shown without its teams, to be opened by a switch.
 */
export function withTeams(
	others: readonly { id: string; name: string }[],
	teamsByOrganization: ReadonlyMap<string, readonly TOrganizationTeam[]> | null
): ITeamMenuOrganization[] {
	return others.map((organization) => {
		const teams = teamsByOrganization?.get(organization.id);
		if (!teams) {
			return { ...organization, teams: [], teamsListed: false };
		}
		const named = teams.filter((team) => Boolean(team.id && team.name));
		const ofThisOrganization = named.filter((team) => !team.organizationId || team.organizationId === organization.id);
		return { ...organization, teams: ofThisOrganization, teamsListed: true };
	});
}

/**
 * The organizations of the team menu, read the same way in both API modes: the memberships, then, when the person may
 * read every organization's teams (`listsTeams`), each other organization's teams through `readTeams`. An organization
 * whose teams could not be read is offered as one to switch to instead of failing the whole menu.
 */
export async function readTeamMenuOrganizations({
	memberships,
	currentOrganizationId,
	listsTeams,
	readTeams
}: {
	memberships: readonly ITeamMenuMembership[];
	currentOrganizationId: string | null | undefined;
	listsTeams: boolean;
	readTeams: (organizationId: string) => Promise<readonly TOrganizationTeam[]>;
}): Promise<ITeamMenuOrganizations> {
	const { current, others } = teamMenuOrganizationsOf(memberships, currentOrganizationId);
	const hasOthersToRead = listsTeams && others.length > 0;
	if (!hasOthersToRead) {
		return { current, others: withTeams(others, null) };
	}
	const reads = await Promise.allSettled(others.map((organization) => readTeams(organization.id)));
	const teamsByOrganization = new Map<string, readonly TOrganizationTeam[]>();
	reads.forEach((read, index) => {
		if (read.status === 'fulfilled') {
			teamsByOrganization.set(others[index].id, read.value);
		}
	});
	return { current, others: withTeams(others, teamsByOrganization) };
}

/**
 * The team to open in an organization just switched to: the first of `preferredTeamIds` that is one of its teams
 * (the team last opened there, then the person's last team), else its first team; null when it has none.
 */
export function teamToOpenAfterSwitch(
	teams: readonly TOrganizationTeam[],
	preferredTeamIds: readonly (string | null | undefined)[]
): TOrganizationTeam | null {
	for (const preferredTeamId of preferredTeamIds) {
		const preferred = preferredTeamId ? teams.find((team) => team.id === preferredTeamId) : undefined;
		if (preferred) {
			return preferred;
		}
	}
	return teams[0] ?? null;
}
