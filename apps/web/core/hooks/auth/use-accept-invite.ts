import { EInvitationState, TInvitationState } from '@/core/types/schemas/user/invite.schema';
import { useCallback, useState } from 'react';
import { useInviteValidation } from '../invitations/use-invite-validation';
import { userOrganizationService } from '@/core/services/client/api/users/user-organization.service';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams/team.service';
import { CookiesDataType, setAuthCookies } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

export function useAcceptInvite() {
	const [invitationState, setInvitationState] = useState<TInvitationState>({
		state: EInvitationState.IDLE,
		data: null,
		error: null
	});
	const { acceptInvitationLoading, acceptInvitationMutation, validateInviteByCode } = useInviteValidation();
	// Stable function reference (the mutation result object itself changes on every state transition).
	const acceptInvitation = acceptInvitationMutation.mutateAsync;

	const handleAcceptInvitation = useCallback(
		async ({
			password,
			user,
			code,
			email
		}: {
			password: string;
			user: { firstName: string | null; lastName: string | null; email: string };
			code: string;
			email: string;
		}) => {
			try {
				if (invitationState?.state !== EInvitationState.VALIDATED) return;

				const res = await acceptInvitation({
					user,
					password,
					code,
					email
				});

				// Proxy mode: the /api/invite/accept route has read the organization and team and set the session
				// cookies itself. The reads below hand the new token to Gauzy, which only direct mode supports.
				const isProxyMode = !GAUZY_API_BASE_SERVER_URL.value;
				if (isProxyMode) return;

				// Prepare auth cookies

				const { data: userOrganizations } = await userOrganizationService.getUserOrganizations({
					tenantId: res.user.tenantId!,
					userId: res.user.id,
					token: res.token
				});

				/**
				 * Get the organization the user was invited to
				 *
				 * If the user has multiple organizations, we need to find the one the user was invited to
				 *
				 */
				const userOrganization =
					userOrganizations.items.find(
						(el) => el.organization?.name === invitationState.data.organization.name
					) || userOrganizations.items[0];

				const { data: teams } = await organizationTeamService.getAllOrganizationTeam(
					{ tenantId: res.user.tenantId!, organizationId: userOrganization?.organizationId || '' },
					res.token
				);

				const team = teams.items?.[0];

				const authCookies: CookiesDataType = {
					access_token: res.token,
					refresh_token: {
						token: res.refresh_token || ''
					},
					teamId: team.id,
					tenantId: res.user.tenantId!,
					organizationId: userOrganization?.organizationId!,
					languageId: 'en',
					userId: res.user.id,
					noTeamPopup: true
				};

				setAuthCookies({ ...authCookies });
			} catch (error) {
				console.error('Accept invitation error:', error);
			}
		},
		[acceptInvitation, invitationState.state, invitationState.data]
	);

	const validateInvitation = useCallback(
		async ({ code, email }: { code: string; email: string }) => {
			setInvitationState({
				state: EInvitationState.LOADING,
				loading: true,
				data: null,
				error: null
			});

			try {
				const res = await validateInviteByCode({ code: code, email });

				setInvitationState({
					state: EInvitationState.VALIDATED,
					loading: false,
					data: res,
					error: null
				});
			} catch (error) {
				setInvitationState({
					state: EInvitationState.FAILED,
					loading: false,
					data: null,
					error
				});
				console.error('Failed to validate invitation:', error);
			}
		},
		[validateInviteByCode]
	);

	return {
		validateInvitation,
		handleAcceptInvitation,
		acceptInvitationLoading,
		invitationState,
		setInvitationState
	};
}
