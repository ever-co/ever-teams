'use client';

import {
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie,
	setActiveProjectIdCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import { IOrganizationTeamList, IOrganizationTeamUpdate, IOrganizationTeamWithMStatus } from '@/core/types/interfaces';
import {
	activeTeamIdState,
	activeTeamManagersState,
	activeTeamState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	organizationTeamsState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import isEqual from 'lodash/isEqual';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useSettings } from './useSettings';
import { LAST_WORSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { organizationTeamService } from '@/core/services/client/api/organization-team';

/**
 * It updates the `teams` state with the `members` status from the `team` status API
 * @returns An object with three properties:
 * teams: The current value of the teams state.
 * setTeams: A function that can be used to update the teams state.
 * setTeamUpdate: A function that can be used to update the teams state.
 */
function useTeamsState() {
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);

	const setTeamsUpdate = useCallback(
		(team: IOrganizationTeamWithMStatus) => {
			// Update active teams fields with from team Status API
			setTeams((tms) => {
				return [...tms.filter((t) => t.id != team.id), team];
			});
		},
		[setTeams]
	);

	return {
		teams,
		setTeams,
		setTeamsUpdate,
		teamsRef
	};
}

/**
 * It creates a new team for the current organization
 * @returns An object with two properties:
 * 1. createOrganizationTeam: A function that takes a string as an argument and returns a promise.
 * 2. loading: A boolean value.
 */
function useCreateOrganizationTeam() {
	const { loading, queryCall } = useQuery(organizationTeamService.createOrganizationTeam);
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const { refreshToken, $user } = useAuthenticateUser();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);

	const createOrganizationTeam = useCallback(
		(name: string) => {
			const teams = teamsRef.current;
			const $name = name.trim();
			const exits = teams.find((t) => t.name.toLowerCase() === $name.toLowerCase());

			if (exits || $name.length < 2 || !$user.current) {
				return Promise.reject(new Error('Invalid team name !'));
			}

			return queryCall($name, $user.current).then(async (res) => {
				const dt = res.data?.items || [];
				setTeams(dt);
				const created = dt.find((t) => t.name === $name);
				if (created) {
					setActiveTeamIdCookie(created.id);
					setOrganizationIdCookie(created.organizationId);
					// This must be called at the end (Update store)
					setActiveTeamId(created.id);
					if (!isTeamMember) {
						setIsTeamMember(true);
					}

					/**
					 * DO NOT REMOVE
					 * Refresh Token needed for the first time when new Organization is created, As in backend permissions are getting updated
					 * */
					await refreshToken();
				}
				return res;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isTeamMember, queryCall, refreshToken, setActiveTeamId, setIsTeamMember, setTeams, teamsRef]
	);

	return {
		createOrganizationTeam,
		loading
	};
}

/**
 * It takes a team and an optional data object and updates the team with the data
 */
function useUpdateOrganizationTeam() {
	const { loading, queryCall } = useQuery(organizationTeamService.updateOrganizationTeam);
	const { setTeamsUpdate } = useTeamsState();

	const updateOrganizationTeam = useCallback(
		(team: IOrganizationTeamList, data: Partial<IOrganizationTeamUpdate> = {}) => {
			const members = team.members;

			const body: Partial<IOrganizationTeamUpdate> = {
				id: team.id,
				memberIds: members
					.map((t) => t.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				managerIds: members
					.filter((m) => m.role && m.role.name === 'MANAGER')
					.map((t) => t.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				name: team.name,
				tenantId: team.tenantId,
				organizationId: team.organizationId,
				tags: [],
				...data
			};

			/* Updating the team state with the data from the API. */
			queryCall(team.id, body).then((res) => {
				setTeamsUpdate(res.data);
			});
		},
		[queryCall, setTeamsUpdate]
	);

	return { updateOrganizationTeam, loading };
}
/**
 * A powerful hook for managing organization teams with complete CRUD operations and state management.
 * This hook centralizes all team-related operations and states in one place.
 *
 * @returns {Object} An object containing the following properties and methods:
 *
 * @property {() => Promise<void>} loadTeamsData
 * Function that fetches and synchronizes the latest teams data. It handles:
 * - Loading the initial teams data
 * - Updating the active team
 * - Managing team cookies
 * - Syncing with local storage
 *
 * @property {boolean} loading
 * Global loading state for team operations
 *
 * @property {IOrganizationTeamList[]} teams
 * Array containing all teams in the organization. Each team includes:
 * - Team details (id, name, etc.)
 * - Member information
 * - Projects associated
 * - Roles and permissions
 *
 * @property {boolean} teamsFetching
 * Specific loading state for team fetching operations
 *
 * @property {IOrganizationTeamList} activeTeam
 * Currently selected team with all its details
 *
 * @property {(team: IOrganizationTeamList) => void} setActiveTeam
 * Sets the active team and handles:
 * - Cookie updates
 * - Local storage sync
 * - Organization ID updates
 * - Project ID updates
 *
 * @property {(name: string) => Promise<any>} createOrganizationTeam
 * Creates a new team with validation:
 * - Checks for duplicate names
 * - Validates name length
 * - Updates necessary cookies
 * - Refreshes authentication token
 *
 * @property {boolean} createOTeamLoading
 * Loading state for team creation
 *
 * @property {any} firstLoadTeamsData
 * Initial data loaded when the hook is first initialized
 *
 * @property {(data: IOrganizationTeamUpdate) => Promise<any>} editOrganizationTeam
 * Updates existing team information with full validation
 *
 * @property {boolean} editOrganizationTeamLoading
 * Loading state for team editing operations
 *
 * @property {(id: string) => Promise<any>} deleteOrganizationTeam
 * Deletes a team and handles cleanup operations
 *
 * @property {boolean} deleteOrganizationTeamLoading
 * Loading state for team deletion
 *
 * @property {ITeamManager[]} activeTeamManagers
 * List of managers for the active team with their roles and permissions
 *
 * @property {(team: IOrganizationTeamList, data?: Partial<IOrganizationTeamUpdate>) => void} updateOrganizationTeam
 * Updates team details with partial data support
 *
 * @property {boolean} updateOTeamLoading
 * Loading state for team updates
 *
 * @property {(teams: IOrganizationTeamList[]) => void} setTeams
 * Updates the entire teams list with proper state management
 *
 * @property {boolean} isTeamMember
 * Indicates if current user is a team member
 *
 * @property {boolean} removeUserFromAllTeamLoading
 * Loading state for user removal operations
 *
 * @property {(userId: string) => Promise<any>} removeUserFromAllTeam
 * Removes user from all teams with proper cleanup:
 * - Updates user permissions
 * - Refreshes authentication
 * - Updates team states
 *
 * @property {boolean} loadingTeam
 * Loading state for single team operations
 *
 * @property {boolean} isTrackingEnabled
 * Indicates if time tracking is enabled for current user
 *
 * @property {string | null} memberActiveTaskId
 * ID of current user's active task, null if no active task
 *
 * @property {boolean} isTeamMemberJustDeleted
 * Flag indicating recent member deletion
 *
 * @property {boolean}  isTeamManager
 * If the active user is a team manager
 *
 * @property {(value: boolean) => void} setIsTeamMemberJustDeleted
 * Updates the member deletion state
 *
 * @example
 * ```typescript
 * const {
 *   teams,
 *   activeTeam,
 *   createOrganizationTeam,
 *   updateOrganizationTeam
 * } = useOrganizationTeams();
 *
 * // Create new team
 * await createOrganizationTeam("New Team Name");
 *
 * // Update team
 * await updateOrganizationTeam(activeTeam, { name: "Updated Name" });
 * ```
 */

export function useOrganizationTeams() {
	const {
		loading: getOrganizationTeamsLoading,
		queryCall: getOrganizationTeamsQueryCall,
		loadingRef: getOrganizationTeamsLoadingRef
	} = useQuery(organizationTeamService.getOrganizationTeams);
	const {
		loading: loadingTeam,
		queryCall: queryCallTeam,
		loadingRef: loadingRefTeam
	} = useQuery(organizationTeamService.getOrganizationTeam);
	const { teams, setTeams, setTeamsUpdate, teamsRef } = useTeamsState();
	const activeTeam = useAtomValue(activeTeamState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	const loadingTeamsRef = useSyncRef(getOrganizationTeamsLoading);

	const [activeTeamId, setActiveTeamId] = useAtom(activeTeamIdState);
	const [isTeamMemberJustDeleted, setIsTeamMemberJustDeleted] = useAtom(isTeamMemberJustDeletedState);
	// const [isTeamJustDeleted, setIsTeamJustDeleted] = useAtom(isTeamJustDeletedState);
	const { firstLoadData: firstLoadTeamsData } = useFirstLoad();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);
	const { updateUserFromAPI, refreshToken, user } = useAuthenticateUser();
	const { updateAvatar: updateUserLastTeam } = useSettings();
	const timerStatus = useAtomValue(timerStatusState);

	const [isTeamManager, setIsTeamManager] = useState(false);
	// const setMemberActiveTaskId = useSetAtom(memberActiveTaskIdState);

	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const currentUser = members.find((member) => member.employee.userId === user?.id);

	const memberActiveTaskId =
		(timerStatus?.running && timerStatus?.lastLog?.taskId) || currentUser?.activeTaskId || null;

	const isTrackingEnabled = activeTeam?.members?.find(
		(member) => member.employee.userId === user?.id && member.isTrackingEnabled
	)
		? true
		: false;

	// Updaters
	const { createOrganizationTeam, loading: createOTeamLoading } = useCreateOrganizationTeam();

	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();

	const { loading: editOrganizationTeamLoading, queryCall: editQueryCall } = useQuery(
		organizationTeamService.editOrganizationTeam
	);

	const { loading: deleteOrganizationTeamLoading, queryCall: deleteQueryCall } = useQuery(
		organizationTeamService.deleteOrganizationTeam
	);

	const { loading: removeUserFromAllTeamLoading, queryCall: removeUserFromAllTeamQueryCall } = useQuery(
		organizationTeamService.removeUserFromAllTeams
	);

	const isManager = useCallback(() => {
		const $u = user;
		const isM = members.find((member) => {
			const isUser = member.employee.userId === $u?.id;
			return isUser && member.role && member.role.name === 'MANAGER';
		});
		setIsTeamManager(!!isM);
	}, [user, members]);

	const setActiveTeam = useCallback(
		(team: (typeof teams)[0]) => {
			setActiveTeamIdCookie(team?.id);
			setOrganizationIdCookie(team?.organizationId);
			// This must be called at the end (Update store)
			setActiveTeamId(team?.id);

			// Set Project Id to cookie
			// TODO: Make it dynamic when we add Dropdown in Navbar
			if (team && team?.projects && team.projects.length) {
				setActiveProjectIdCookie(team.projects[0].id);
			}
			window && window?.localStorage.setItem(LAST_WORSPACE_AND_TEAM, team.id);
			if (user) updateUserLastTeam({ id: user.id, lastTeamId: team.id });
		},
		[setActiveTeamId, updateUserLastTeam, user]
	);

	const loadTeamsData = useCallback(() => {
		if (
			getOrganizationTeamsLoadingRef.current ||
			loadingRefTeam.current ||
			!user?.employee.organizationId ||
			!user?.employee.tenantId
		) {
			return;
		}

		let teamId = getActiveTeamIdCookie();
		setActiveTeamId(teamId);

		return getOrganizationTeamsQueryCall(user?.employee.organizationId, user?.employee.tenantId).then((res) => {
			if (res.data?.items && res.data?.items?.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
			}
			const latestTeams = res.data?.items || [];

			const latestTeamsSorted = latestTeams.slice().sort((a: any, b: any) => a.name.localeCompare(b.name));

			const teamsRefSorted = teamsRef.current.slice().sort((a, b) => a.name.localeCompare(b.name));

			/**
			 * Check deep equality,
			 * No need to update state if all the Team details are same
			 * (It prevents unnecessary re-rendering)
			 *
			 * Use teamsRef to make we always get the lastest value
			 */
			if (!teamId && !isEqual(latestTeamsSorted, teamsRefSorted)) {
				setTeams(latestTeams);
			}

			// Handle case where user might Remove Account from all teams,
			// In such case need to update active team with Latest list of Teams
			if (!latestTeams.find((team: any) => team.id === teamId) && latestTeams.length) {
				setIsTeamMemberJustDeleted(true);
				setActiveTeam(latestTeams[0]);
			} else if (!latestTeams.length) {
				teamId = '';
			}

			teamId &&
				user?.employee.organizationId &&
				user?.employee.tenantId &&
				queryCallTeam(teamId, user?.employee.organizationId, user?.employee.tenantId).then((res) => {
					const newTeam = res.data;

					/**
					 * Check deep equality,
					 * No need to update state if all the Team details are same
					 * (It prevents unnecessary re-rendering)
					 */
					if (!isEqual(latestTeamsSorted, teamsRefSorted)) {
						setTeams([newTeam, ...latestTeams.filter((team: any) => team.id !== newTeam.id)]);

						// Set Project Id to cookie
						// TODO: Make it dynamic when we add Dropdown in Navbar
						if (newTeam && newTeam.projects && newTeam.projects.length) {
							setActiveProjectIdCookie(newTeam.projects[0].id);
						}
					}
				});

			return res;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [getOrganizationTeamsQueryCall, queryCallTeam, setActiveTeam, setActiveTeamId, setIsTeamMember, setTeams]);

	// /**
	//  * Get active team profile from api
	//  */
	// useEffect(() => {
	// 	if (activeTeamId && firstLoad && user?.employee.organizationId && user?.employee.tenantId) {
	// 		getOrganizationTeamAPI(activeTeamId, user?.employee.organizationId, user?.employee.tenantId).then((res) => {
	// 			!loadingTeamsRef.current && setTeamsUpdate(res.data);
	// 		});
	// 	}
	// }, [
	// 	activeTeamId,
	// 	firstLoad,
	// 	loadingTeamsRef,
	// 	setTeams,
	// 	setTeamsUpdate,
	// 	user?.employee?.organizationId,
	// 	user?.employee?.tenantId
	// ]);

	const editOrganizationTeam = useCallback(
		(data: IOrganizationTeamUpdate) => {
			return editQueryCall(data).then((res) => {
				setTeamsUpdate(res.data);
				return res;
			});
		},
		[editQueryCall, setTeamsUpdate]
	);

	const deleteOrganizationTeam = useCallback(
		(id: string) => {
			return deleteQueryCall(id).then((res) => {
				loadTeamsData();
				return res;
			});
		},
		[deleteQueryCall, loadTeamsData]
	);

	const removeUserFromAllTeam = useCallback(
		(userId: string) => {
			return removeUserFromAllTeamQueryCall(userId).then((res) => {
				loadTeamsData();
				refreshToken().then(() => {
					updateUserFromAPI();
				});

				return res;
			});
		},
		[loadTeamsData, removeUserFromAllTeamQueryCall, refreshToken, updateUserFromAPI]
	);

	useEffect(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setActiveProjectIdCookie(activeTeam?.projects[0]?.id);
		}
		isManager();
	}, [activeTeam, isManager]);

	const handleFirstLoad = useCallback(async () => {
		await loadTeamsData();

		if (activeTeamId && organizationId && tenantId) {
			const res = await organizationTeamService.getOrganizationTeam(activeTeamId, organizationId, tenantId);

			if (res) {
				!loadingTeamsRef.current && setTeamsUpdate(res.data);
			}
		}

		firstLoadTeamsData();
	}, [activeTeamId, firstLoadTeamsData, loadTeamsData, loadingTeamsRef, organizationId, setTeamsUpdate, tenantId]);

	return {
		loadTeamsData,
		getOrganizationTeamsLoading,
		teams,
		activeTeam,
		setActiveTeam,
		createOrganizationTeam,
		createOTeamLoading,
		firstLoadTeamsData: handleFirstLoad,
		editOrganizationTeam,
		editOrganizationTeamLoading,
		deleteOrganizationTeam,
		deleteOrganizationTeamLoading,
		activeTeamManagers,
		updateOrganizationTeam,
		updateOTeamLoading,
		setTeams,
		isTeamMember,
		isTeamManager,
		removeUserFromAllTeamLoading,
		removeUserFromAllTeamQueryCall,
		removeUserFromAllTeam,
		loadingTeam,
		isTrackingEnabled,
		memberActiveTaskId,
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	};
}
