'use client';

import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { organizationOpeningState } from '@/core/stores';
import {
	getTenantIdCookie,
	setAccessTokenCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie,
	setRefreshTokenCookie
} from '@/core/lib/helpers/cookies';
import { readLastOpenedTeamId, storeLastOpenedTeamId } from '@/core/lib/auth/last-opened-team';
import { teamToOpenAfterSwitch } from '@/core/lib/utils/team-menu-organizations';
import { rememberTabTeam } from '@/core/lib/auth/tab-organization';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams/team.service';
import type { TOrganizationTeam } from '@/core/types/schemas';

interface ISwitchOrganizationInput {
	organizationId: string;
	/** The team picked in the menu; without one, the person's team there is opened. */
	team?: TOrganizationTeam;
}

/**
 * Opens another organization of the workspace without signing out (ever-co/ever-teams#5204), as the sign-in screen
 * does: Gauzy renews the session for it (`POST /auth/switch-organization`), the cookies take the new session, the
 * organization and its team, and the app starts again on it so that every page reads that organization only. When
 * Gauzy refuses, nothing changes and the error is the caller's to show.
 */
export function useSwitchOrganization() {
	const { data: user } = useUserQuery();
	const setOrganizationOpening = useSetAtom(organizationOpeningState);

	return useMutation({
		// A timer started during the switch would keep running in the organization left behind
		onMutate: () => setOrganizationOpening(true),
		// On success the page is replaced, which ends the hold
		onError: () => setOrganizationOpening(false),
		mutationFn: async ({ organizationId, team }: ISwitchOrganizationInput) => {
			const { data: session } = await authService.switchOrganizationRaw(organizationId);
			if (!session?.token) {
				throw new Error('The organization switch was refused');
			}
			setAccessTokenCookie(session.token);
			if (session.refresh_token) {
				setRefreshTokenCookie(session.refresh_token);
			}
			setOrganizationIdCookie(organizationId);
			// This tab now works in that organization; the page opens on it right after (#5134)
			rememberTabTeam({ id: null, organizationId });

			const teamToOpen = team ?? (await personsTeamIn(organizationId, session.token, user?.id, user?.lastTeamId));
			if (teamToOpen) {
				setActiveTeamIdCookie(teamToOpen.id);
				rememberTabTeam(teamToOpen);
				// Storage is optional (full, or disabled): the team cookie already names the team, and the new session is
				// installed, so the switch goes on without it
				storeLastOpenedTeamId(teamToOpen.id);
			}
			return { organizationId, teamId: teamToOpen?.id ?? null };
		},
		onSuccess: () => {
			globalThis.window?.location.assign('/');
		}
	});
}

/**
 * The person's team in the organization just switched to, read with its new session: the one last opened, then their
 * last team, else the first. A failed read opens none and lets the app choose, as after a sign-in.
 */
async function personsTeamIn(
	organizationId: string,
	accessToken: string,
	userId: string | undefined,
	lastTeamId: string | null | undefined
): Promise<TOrganizationTeam | null> {
	try {
		const { data } = await organizationTeamService.getOrganizationTeams({
			scope: { tenantId: getTenantIdCookie(), organizationId, userId, accessToken }
		});
		const teamsThere = (data.items ?? []).filter((team) => team.organizationId === organizationId);
		// A browser that refuses its storage still opens the person's last team, not none
		return teamToOpenAfterSwitch(teamsThere, [readLastOpenedTeamId(), lastTeamId]);
	} catch {
		return null;
	}
}
