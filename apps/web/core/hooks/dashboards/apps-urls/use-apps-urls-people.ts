'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { organizationTeamsState } from '@/core/stores/teams/organization-team';
import type { TOrganizationTeam } from '@/core/types/schemas';
import {
	filterPeopleOf,
	type AppUsageRow,
	type TeamMemberSource,
	type UsagePerson
} from '@/core/lib/utils/dashboards/apps-urls';

function membersOfTeams(teams: TOrganizationTeam[]): TeamMemberSource[] {
	const members: TeamMemberSource[] = [];
	for (const team of teams) {
		for (const member of team.members ?? []) {
			members.push(member);
		}
	}
	return members;
}

function memberSignatureOf(member: TeamMemberSource) {
	const employee = member.employee;
	const id = employee?.id ?? member.employeeId ?? '';
	const name = employee?.fullName ?? employee?.user?.name ?? '';
	const imageUrl = employee?.user?.imageUrl ?? '';
	return `${id}:${name}:${imageUrl}`;
}

function haveSameMembers(previous: TeamMemberSource[], next: TeamMemberSource[]) {
	if (previous.length !== next.length) {
		return false;
	}
	for (let index = 0; index < previous.length; index += 1) {
		const previousSignature = memberSignatureOf(previous[index]);
		const nextSignature = memberSignatureOf(next[index]);
		if (previousSignature !== nextSignature) {
			return false;
		}
	}
	return true;
}

/** The teams refresh their members' timer states often; the filter only re-renders when a person changes. */
const teamMembersState = selectAtom(organizationTeamsState, membersOfTeams, haveSameMembers);

/** The people a manager can narrow the report to, each once, by name. */
export function useAppsUrlsPeople(rows: ReadonlyArray<AppUsageRow>): UsagePerson[] {
	const teamMembers = useAtomValue(teamMembersState);
	return useMemo(() => filterPeopleOf(teamMembers, rows), [rows, teamMembers]);
}
