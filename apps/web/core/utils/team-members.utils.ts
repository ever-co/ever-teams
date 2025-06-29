import { TOrganizationTeamEmployee, TOrganizationTeam, TUser } from '@/core/types/schemas';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

// Constants for team member utilities
export const TEAM_MEMBER_CONSTANTS = {
	TEMP_ID_PREFIX: 'temp-',
	TEMP_EMPLOYEE_PREFIX: 'temp-employee-',
	EMPTY_ARRAY: [] as TOrganizationTeamEmployee[],
	TIMER_STATUS_PRIORITY: {
		[ETimerStatus.RUNNING]: 4,
		[ETimerStatus.ONLINE]: 3,
		[ETimerStatus.PAUSE]: 2,
		[ETimerStatus.IDLE]: 1,
		[ETimerStatus.SUSPENDED]: 0,
		undefined: 0
	} as const
} as const;

// Filter types for better type safety
export type TeamMemberFilterType = 'all' | 'idle' | 'online' | 'running' | 'pause' | 'suspended';

/**
 * Creates a placeholder team member object for users not yet in the team
 * Centralizes the logic to avoid duplication across components
 */
export const createCurrentUserPlaceholder = (user: TUser, activeTeam: TOrganizationTeam): TOrganizationTeamEmployee => {
	return {
		id: `${TEAM_MEMBER_CONSTANTS.TEMP_ID_PREFIX}${user.id}`,
		employeeId: user.employee?.id || `${TEAM_MEMBER_CONSTANTS.TEMP_EMPLOYEE_PREFIX}${user.id}`,
		employee: {
			id: user.employee?.id || `${TEAM_MEMBER_CONSTANTS.TEMP_EMPLOYEE_PREFIX}${user.id}`,
			userId: user.id,
			user: user,
			organizationId: user.employee?.organizationId || activeTeam.organizationId,
			tenantId: user.employee?.tenantId || activeTeam.tenantId,
			isActive: true,
			isArchived: false
		},
		role: null,
		isTrackingEnabled: user.employee?.isTrackingEnabled || false,
		activeTaskId: null,
		organizationTeamId: activeTeam.id,
		assignedAt: new Date(),
		isManager: false,
		isOwner: false,
		order: 0,
		timerStatus: undefined
	} as TOrganizationTeamEmployee;
};

/**
 * Finds the current user in team members or creates a placeholder
 * Centralizes the current user identification logic
 */
export const findOrCreateCurrentUser = (
	members: TOrganizationTeamEmployee[],
	user: TUser | null,
	activeTeam: TOrganizationTeam | null
): TOrganizationTeamEmployee | undefined => {
	if (!user) return undefined;

	// Try to find current user in existing members
	const currentUser = members.find((m) => m.employee?.userId === user.id);

	if (currentUser) return currentUser;

	// Create placeholder if user not found and team exists
	if (activeTeam) {
		return createCurrentUserPlaceholder(user, activeTeam);
	}

	return undefined;
};

/**
 * Creates a complete member list including current user
 * Ensures current user is always included and positioned first
 */
export const createCompleteTeamMembersList = (
	rawMembers: TOrganizationTeamEmployee[],
	user: TUser | null,
	activeTeam: TOrganizationTeam | null
): TOrganizationTeamEmployee[] => {
	const allMembers = [...rawMembers];

	// Check if current user is already in the members list
	const currentUserInMembers = rawMembers.find((m) => m.employee?.userId === user?.id);

	// Add current user placeholder if not already included
	if (!currentUserInMembers && user && activeTeam) {
		const currentUserPlaceholder = createCurrentUserPlaceholder(user, activeTeam);
		allMembers.unshift(currentUserPlaceholder); // Add at the beginning
	}

	return allMembers;
};

/**
 * Sorts team members by work status priority
 * Centralizes the sorting logic for consistency
 */
export const sortByWorkStatus = (a: TOrganizationTeamEmployee, b: TOrganizationTeamEmployee): number => {
	const priorityA =
		TEAM_MEMBER_CONSTANTS.TIMER_STATUS_PRIORITY[
			a.timerStatus as keyof typeof TEAM_MEMBER_CONSTANTS.TIMER_STATUS_PRIORITY
		] ?? 0;
	const priorityB =
		TEAM_MEMBER_CONSTANTS.TIMER_STATUS_PRIORITY[
			b.timerStatus as keyof typeof TEAM_MEMBER_CONSTANTS.TIMER_STATUS_PRIORITY
		] ?? 0;
	return priorityB - priorityA;
};

/**
 * Filter condition function for team members
 * Centralizes filter logic to avoid duplication
 */
export const createFilterCondition = (activeFilter: TeamMemberFilterType, currentUserId?: string) => {
	return (member: TOrganizationTeamEmployee): boolean => {
		switch (activeFilter) {
			case 'idle':
				// Include users with no timer status (new users) or idle status
				return !member.timerStatus || member.timerStatus === ETimerStatus.IDLE;
			case 'online':
				// Current user should ALWAYS appear in ONLINE filter when authenticated
				// regardless of their timer status (they're online by definition)
				return member.timerStatus === ETimerStatus.ONLINE || member.employee?.user?.id === currentUserId;
			case 'running':
				return member.timerStatus === ETimerStatus.RUNNING;
			case 'pause':
				return member.timerStatus === ETimerStatus.PAUSE;
			default:
				return member.timerStatus === activeFilter;
		}
	};
};

/**
 * Ensures current user is positioned first in filtered results
 * Centralizes the positioning logic
 */
export const ensureCurrentUserFirst = (
	members: TOrganizationTeamEmployee[],
	currentUserId?: string
): TOrganizationTeamEmployee[] => {
	if (!currentUserId || members.length === 0) return members;

	const currentUserIndex = members.findIndex((m) => m.employee?.user?.id === currentUserId);

	if (currentUserIndex > 0) {
		// Move current user to first position
		const currentUserMember = members.splice(currentUserIndex, 1)[0];
		members.unshift(currentUserMember);
	}

	return members;
};

/**
 * Filters team members and ensures current user positioning
 * Complete filtering pipeline in one function
 */
export const filterAndPositionTeamMembers = (
	allMembers: TOrganizationTeamEmployee[],
	activeFilter: TeamMemberFilterType,
	currentUserId?: string
): TOrganizationTeamEmployee[] => {
	let filteredMembers: TOrganizationTeamEmployee[];

	if (activeFilter === 'all') {
		filteredMembers = allMembers;
	} else {
		const filterCondition = createFilterCondition(activeFilter, currentUserId);
		filteredMembers = allMembers.filter(filterCondition);
	}

	// Ensure current user is always first in filtered results
	return ensureCurrentUserFirst(filteredMembers, currentUserId);
};
