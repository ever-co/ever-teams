'use client';

import { useMemo } from 'react';
import { emptySheetMemberOf, type SheetMember } from '@/core/lib/utils/dashboards/timesheets';
import type { TOrganizationTeam, TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';

const NO_TEAM_MEMBERS: TOrganizationTeamEmployee[] = [];

function firstTextOf(candidates: ReadonlyArray<string | null | undefined>): string {
	for (const candidate of candidates) {
		const text = candidate?.trim();
		if (text) {
			return text;
		}
	}
	return '';
}

function teamMemberImageOf(teamMember: TOrganizationTeamEmployee): string | null {
	const employeeImage = teamMember.employee?.user?.imageUrl;
	if (employeeImage) {
		return employeeImage;
	}
	return teamMember.user?.imageUrl ?? null;
}

function teamMemberOf(teamMember: TOrganizationTeamEmployee): SheetMember | null {
	const employeeId = teamMember.employeeId ?? teamMember.employee?.id;
	if (!employeeId) {
		return null;
	}
	const name = firstTextOf([teamMember.employee?.fullName, teamMember.fullName, teamMember.user?.name]);
	const imageUrl = teamMemberImageOf(teamMember);
	return emptySheetMemberOf(employeeId, name, imageUrl);
}

export function viewerOf(user: TUser | null | undefined): SheetMember | null {
	const employeeId = user?.employee?.id;
	if (!employeeId) {
		return null;
	}
	const name = firstTextOf([user?.name, user?.employee?.fullName]);
	const imageUrl = user?.imageUrl ?? null;
	return emptySheetMemberOf(employeeId, name, imageUrl);
}

function pickedTeamMembersOf(
	teamMembers: ReadonlyArray<TOrganizationTeamEmployee>,
	pickedIds: ReadonlyArray<string>
): SheetMember[] {
	const picked: SheetMember[] = [];
	for (const teamMember of teamMembers) {
		const member = teamMemberOf(teamMember);
		if (!member) {
			continue;
		}
		if (pickedIds.includes(member.id)) {
			picked.push(member);
		}
	}
	return picked;
}

function keepsViewerIn(pickedIds: ReadonlyArray<string>, viewer: SheetMember) {
	const hasMemberFilter = pickedIds.length > 0;
	if (!hasMemberFilter) {
		return true;
	}
	return pickedIds.includes(viewer.id);
}

export interface SheetEmptyMembersSource {
	user: TUser | null | undefined;
	activeTeam: TOrganizationTeam | null | undefined;
	pickedMemberIds: ReadonlyArray<string>;
	isManage: boolean;
}

/**
 * The members the week sheet offers even without time in the period, so an empty week can be filled: the viewer
 * (when the member filter leaves them in), and for a manager every member picked in that filter.
 */
export function useSheetEmptyMembers({ user, activeTeam, pickedMemberIds, isManage }: SheetEmptyMembersSource) {
	const teamMembers = activeTeam?.members ?? NO_TEAM_MEMBERS;

	return useMemo(() => {
		const members: SheetMember[] = [];
		if (isManage) {
			const picked = pickedTeamMembersOf(teamMembers, pickedMemberIds);
			members.push(...picked);
		}
		const viewer = viewerOf(user);
		if (!viewer) {
			return members;
		}
		const isAlreadyOffered = members.some((member) => member.id === viewer.id);
		const isKept = keepsViewerIn(pickedMemberIds, viewer);
		if (isKept && !isAlreadyOffered) {
			members.push(viewer);
		}
		return members;
	}, [isManage, pickedMemberIds, teamMembers, user]);
}
