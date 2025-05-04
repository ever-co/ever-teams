'use client';

import { setAuthCookies } from '@/core/lib/helpers/index';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IOrganizationTeam, ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces';
import { useSession } from 'next-auth/react';
import { singinService } from '@/core/services/client/api/auth/singin.service';
type SigninResult = {
	access_token: string;
	confirmed_mail: string;
	organizationId: string;
	refresh_token: {
		token: string;
		decoded: any;
	};
	tenantId: string;
	userId: string;
};

export function useAuthenticationSocialLogin() {
	const router = useRouter();
	const [signInWorkspaceLoading, setSignInWorkspaceLoading] = useState(false);

	const { update: updateNextAuthSession }: any = useSession();

	const updateOAuthSession = useCallback(
		(
			signinResult: SigninResult,
			workspaces: ISigninEmailConfirmWorkspaces[],
			selectedWorkspace: number,
			selectedTeam: string,
			defaultTeamId?: IOrganizationTeam['id']
		) => {
			setSignInWorkspaceLoading(true);
			singinService
				.signInWorkspace({
					email: signinResult.confirmed_mail,
					token: workspaces[selectedWorkspace].token,
					defaultTeamId
				})
				.then(async (result) => {
					const tenantId = result.user?.tenantId || '';
					const access_token = result.token;
					const userId = result.user?.id;

					const organizations = await singinService.getUserOrganizations({
						tenantId,
						userId,
						token: access_token
					});
					const organization = organizations?.data.items[0];
					if (!organization) {
						return Promise.reject({
							errors: {
								email: 'Your account is not yet ready to be used on the Ever Teams Platform'
							}
						});
					}

					updateNextAuthSession({
						access_token,
						refresh_token: {
							token: result.refresh_token
						},
						teamId: selectedTeam,
						tenantId,
						organizationId: organization?.organizationId,
						languageId: 'en',
						noTeamPopup: true,

						userId,
						workspaces: workspaces,
						confirmed_mail: signinResult.confirmed_mail
					});

					setAuthCookies({
						access_token,
						refresh_token: {
							token: result.refresh_token
						},
						teamId: selectedTeam,
						tenantId,
						organizationId: organization?.organizationId,
						languageId: 'en',
						noTeamPopup: undefined,
						userId
					});
					setSignInWorkspaceLoading(false);
					router.push('/');
				})
				.catch((err) => console.log(err));
		},
		[router, updateNextAuthSession]
	);

	return {
		updateOAuthSession,
		signInWorkspaceLoading
	};
}

export type TAuthenticationSocial = ReturnType<typeof useAuthenticationSocialLogin>;
