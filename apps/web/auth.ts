import NextAuth from 'next-auth';

import { signWithSocialLoginsRequest } from '@app/services/server/requests';
import { getUserOrganizationsRequest, signInWorkspaceAPI } from '@app/services/client/api/auth/invite-accept';
import { filteredProviders } from '@app/utils/check-provider-env-vars';

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: filteredProviders,
	callbacks: {
		async signIn({ user, account }) {
			try {
				console.log({ user, account });
				const gauzyLoginUser = await signWithSocialLoginsRequest(
					account?.provider ?? '',
					account?.access_token ?? ''
				);
				const data = await signInWorkspaceAPI(
					gauzyLoginUser?.data.confirmed_email,
					gauzyLoginUser?.data.workspaces[0].token
				);
				const tenantId = data.user?.tenantId || '';
				const access_token = data.token;
				const userId = data.user?.id;

				const { data: organizations } = await getUserOrganizationsRequest({
					tenantId,
					userId,
					token: access_token
				});

				const organization = organizations?.items[0];

				if (!organization) {
					return false;
				}

				return !!gauzyLoginUser && !!organization;
			} catch (error) {
				return false;
			}
		},

		async jwt({ token, user, trigger, session, account }) {
			console.log({ user1: user, session, account1: account });
			if (user) {
				const gauzyLoginUser = await signWithSocialLoginsRequest(
					account?.provider ?? '',
					account?.access_token ?? ''
				);
				const data = await signInWorkspaceAPI(
					gauzyLoginUser?.data.confirmed_email,
					gauzyLoginUser?.data.workspaces[0].token
				);
				const tenantId = data.user?.tenantId || '';
				const access_token = data.token;
				const userId = data.user?.id;

				const { data: organizations } = await getUserOrganizationsRequest({
					tenantId,
					userId,
					token: access_token
				});

				const organization = organizations?.items[0];

				if (!organization) {
					return Promise.reject({
						errors: {
							email: 'Your account is not yet ready to be used on the Ever Teams Platform'
						}
					});
				}

				token.authCookie = {
					access_token,
					refresh_token: {
						token: data.refresh_token
					},
					teamId: gauzyLoginUser?.data.workspaces[0].current_teams[0].team_id,
					tenantId,
					organizationId: organization?.organizationId,
					languageId: 'en',
					noTeamPopup: true,
					userId,
					workspaces: gauzyLoginUser?.data.workspaces,
					confirmed_mail: gauzyLoginUser?.data.confirmed_email
				};
			}

			if (trigger === 'update' && session) {
				token = { ...token, authCookie: session };
			}

			return token;
		},
		session({ session, token }) {
			session.user = token.authCookie as any;
			return session;
		}
	},
	pages: {
		error: '/auth/error'
	}
});
