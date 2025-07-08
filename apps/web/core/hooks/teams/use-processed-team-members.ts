import { useMemo } from 'react';
import { TOrganizationTeamEmployee, TOrganizationTeam, TUser } from '@/core/types/schemas';
import {
	TEAM_MEMBER_CONSTANTS,
	findOrCreateCurrentUser,
	createCompleteTeamMembersList,
	sortByWorkStatus,
	filterAndPositionTeamMembers,
	TeamMemberFilterType
} from '@/core/utils/team-members.utils';

interface ProcessedTeamMembersResult {
	members: TOrganizationTeamEmployee[];
	orderedMembers: TOrganizationTeamEmployee[];
	currentUser: TOrganizationTeamEmployee | undefined;
	allMembersWithCurrent: TOrganizationTeamEmployee[];
}

interface FilteredTeamMembersResult {
	filteredMembers: TOrganizationTeamEmployee[];
	totalCount: number;
}

/**
 * Custom hook for processing team members with current user logic
 * Centralizes all member processing logic to avoid duplication
 */
export const useProcessedTeamMembers = (
	activeTeam: TOrganizationTeam | null,
	user: TUser | null
): ProcessedTeamMembersResult => {
	return useMemo(() => {
		const rawMembers = activeTeam?.members || TEAM_MEMBER_CONSTANTS.EMPTY_ARRAY;

		// Filtering valid members (those with employee data)
		const validMembers = rawMembers.filter(
			(member): member is TOrganizationTeamEmployee => member?.employee !== null
		);

		// Sorting with optimized function
		const sortedMembers = validMembers.sort(sortByWorkStatus);

		// Find or create current user
		const currentUser = findOrCreateCurrentUser(validMembers, user, activeTeam);

		// Create complete list including current user
		const allMembersWithCurrent = createCompleteTeamMembersList(validMembers, user, activeTeam);

		return {
			members: validMembers,
			orderedMembers: sortedMembers,
			currentUser,
			allMembersWithCurrent
		};
	}, [
		activeTeam?.members,
		activeTeam?.id,
		activeTeam?.organizationId,
		activeTeam?.tenantId,
		user?.id,
		user?.employee?.id,
		user?.employee?.organizationId,
		user?.employee?.tenantId,
		user?.employee?.isTrackingEnabled
	]);
};

/**
 * Custom hook for filtering team members with current user positioning
 * Handles all filtering logic including current user positioning
 */
export const useFilteredTeamMembers = (
	processedMembers: ProcessedTeamMembersResult,
	activeFilter: TeamMemberFilterType,
	user: TUser | null
): FilteredTeamMembersResult => {
	return useMemo(() => {
		const filteredMembers = filterAndPositionTeamMembers(
			processedMembers.allMembersWithCurrent,
			activeFilter,
			user?.id
		);

		return {
			filteredMembers,
			totalCount: processedMembers.allMembersWithCurrent.length
		};
	}, [processedMembers.allMembersWithCurrent, activeFilter, user?.id]);
};

/**
 * Custom hook that combines member processing and filtering
 * One-stop solution for team member management
 */
export const useTeamMembersWithFiltering = (
	activeTeam: TOrganizationTeam | null,
	user: TUser | null,
	activeFilter: TeamMemberFilterType = 'all'
) => {
	const processedMembers = useProcessedTeamMembers(activeTeam, user);
	const filteredResult = useFilteredTeamMembers(processedMembers, activeFilter, user);

	return {
		...processedMembers,
		...filteredResult
	};
};
