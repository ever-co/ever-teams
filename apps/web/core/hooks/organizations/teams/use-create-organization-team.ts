'use client';
import { setActiveTeamIdCookie, setOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { activeTeamIdState, isTeamMemberState, organizationTeamsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useQueryCall, useSyncRef } from '../../common';
import { useAuthenticateUser } from '../../auth';
import { TOrganizationTeam } from '@/core/types/schemas';

/**
 * It creates a new team for the current organization
 * @returns An object with two properties:
 * 1. createOrganizationTeam: A function that takes a string as an argument and returns a promise.
 * 2. loading: A boolean value.
 */
export function useCreateOrganizationTeam() {
	const { loading, queryCall } = useQueryCall(organizationTeamService.createOrganizationTeam);
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const { refreshToken, $user } = useAuthenticateUser();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);

	const createOrganizationTeam = useCallback(
		(name: string) => {
			const teams = teamsRef.current;
			const $name = name.trim();
			const teamExists = teams.find((t: TOrganizationTeam) => t.name.toLowerCase() === $name.toLowerCase());

			if (teamExists) {
				return Promise.reject(new Error('Team with this name already exists'));
			}
			if ($name.length < 2) {
				return Promise.reject(new Error('Team name must be at least 2 characters long'));
			}
			if (!$user.current) {
				return Promise.reject(new Error('User authentication required'));
			}

			return queryCall($name, $user.current).then(async (res) => {
				const dt = res.data?.items || [];
				setTeams(dt);
				const created = dt.find((t) => t.name === $name);
				if (created) {
					setActiveTeamIdCookie(created.id);
					setOrganizationIdCookie(created.organizationId || '');
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
