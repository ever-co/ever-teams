import { EInvitationState, TInvitationState } from '@/core/types/schemas/user/invite.schema';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTeamInvitations } from '../organizations';
import { userOrganizationService } from '@/core/services/client/api/users/user-organization.service';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams/team.service';
import { setAuthCookies } from '@/core/lib/helpers/cookies';

export function useAcceptInvite() {
	const searchParams = useSearchParams();
	const code = searchParams?.get('code')?.split('/')[0];
	const email = searchParams?.get('email');
	const [invitationState, setInvitationState] = useState<TInvitationState>({
		state: EInvitationState.IDLE,
		data: null,
		error: null
	});
	const { acceptInvitationLoading, acceptInvitationMutation, validateInviteByCode } = useTeamInvitations();

	const handleAcceptInvitation = useCallback(
		async ({ fullName, password }: { fullName: string; password: string }) => {
			try {
				if (invitationState?.state !== EInvitationState.VALIDATED || !code || !email) return;

				const user = {
					firstName: fullName ? fullName.split(' ').slice(0, -1).join(' ') : '',
					lastName: fullName ? fullName.split(' ').slice(-1).join(' ') : ''
				};

				const res = await acceptInvitationMutation.mutateAsync({
					user,
					password,
					code,
					email
				});

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

				const team = teams.items[0];

				const authCookies = {
					access_token: res.token,
					refresh_token: {
						token: res.refresh_token
					},
					teamId: team.id,
					tenantId: res.user.tenantId!,
					organizationId: userOrganization?.organizationId!,
					languageId: 'en',
					noTeamPopup: true,
					userId: res.user.id
				};

				setAuthCookies({ ...authCookies });
			} catch (error) {
				console.error('Accept invitation error:', error);
			}
		},
		[acceptInvitationMutation, invitationState.state, code, email]
	);

	const validateInvitation = useCallback(async () => {
		if (!code || !email) {
			setInvitationState({
				state: EInvitationState.FAILED,
				loading: false,
				data: null,
				error: new Error('Missing parameters')
			});
			return;
		}

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
		}
	}, [code, email, validateInviteByCode]);

	useEffect(() => {
		validateInvitation();
	}, [validateInvitation]);

	return {
		validateInvitation,
		handleAcceptInvitation,
		acceptInvitationLoading,
		invitationState
	};
}
