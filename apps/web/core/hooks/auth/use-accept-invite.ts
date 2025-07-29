import { EInvitationState, TInvitationState } from '@/core/types/schemas/user/invite.schema';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTeamInvitations } from '../organizations';
import { userOrganizationService } from '@/core/services/client/api/users/user-organization.service';

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
			if (invitationState?.state !== EInvitationState.VALIDATED || !code || !email) return;

			const user = {
				firstName: fullName ? fullName.split(' ').slice(0, -1).join(' ') : '',
				lastName: fullName ? fullName.split(' ').slice(-1).join(' ') : '',
				email
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

			const authCookies = {
				access_token: res.token,
				refresh_token: {
					token: res.refresh_token
				},
				// teamId: res.user.employee.te.id,
				tenantId: res.user.tenantId,
				organizationId: res.user.employee?.organizationId,
				languageId: 'en',
				noTeamPopup: true,
				userId: res.user.id
			};
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

			console.log('res', res);
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
