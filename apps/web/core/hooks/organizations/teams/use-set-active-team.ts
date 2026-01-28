'use client';
import { setActiveProjectIdCookie, setActiveTeamIdCookie, setOrganizationIdCookie } from '@/core/lib/helpers/cookies';

import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { activeTeamIdState } from '@/core/stores';
import { TOrganizationTeam } from '@/core/types/schemas';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { useAuthenticateUser } from '../../auth';
import { useSettings } from '../../users';

/**
 * Returns a function to set the active team with full persistence.
 *
 * @description
 * Sets the active team and persists to multiple layers:
 * - Cookies (teamId, organizationId, projectId)
 * - localStorage (for cross-tab persistence)
 * - Server (user's lastTeamId via API)
 * - Jotai state (for immediate UI reactivity)
 *
 * Order of operations is important: state update happens LAST
 * to ensure all persistence layers are synchronized first.
 *
 * @example
 * ```tsx
 * const setActiveTeam = useSetActiveTeam();
 *
 * const handleTeamSwitch = (team: TOrganizationTeam) => {
 *   setActiveTeam(team);
 *   router.push('/dashboard');
 * };
 * ```
 *
 * @see {@link activeTeamIdState} - Jotai state updated by this hook
 * @see {@link useCurrentTeam} - Get the currently active team
 * @see {@link useLoadTeamsData} - Initial team loading logic
 *
 * @returns Callback function `(team: TOrganizationTeam) => void`
 */
export const useSetActiveTeam = () => {
	const { user } = useAuthenticateUser();
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const { updateAvatar: updateUserLastTeam } = useSettings();

	const setActiveTeam = useCallback(
		(team: TOrganizationTeam) => {
			setActiveTeamIdCookie(team?.id);
			setOrganizationIdCookie(team?.organizationId || '');

			// Set Project Id to cookie
			// TODO: Make it dynamic when we add Dropdown in Navbar
			if (team && team?.projects && team.projects.length) {
				setActiveProjectIdCookie(team.projects[0].id);
			}
			window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, team.id);
			// Only update user last team if it's different to avoid unnecessary API calls
			if (user && user.lastTeamId !== team.id) {
				updateUserLastTeam({ id: user.id, lastTeamId: team.id });
			}

			// Set active team ID AFTER teams are updated to ensure proper synchronization
			// This must be called at the end (Update store)
			setActiveTeamId(team?.id);
		},
		[setActiveTeamId, updateUserLastTeam, user]
	);

	return setActiveTeam;
};
