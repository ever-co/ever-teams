import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';
import Twitter from 'next-auth/providers/twitter';
import { signWithSocialLoginsRequest } from '@app/services/server/requests';
import { getUserOrganizationsRequest, signInWorkspaceAPI } from '@app/services/client/api/auth/invite-accept';

const providers: Provider[] = [Facebook, Google, Github, Twitter];

export const mappedProviders = providers.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: providers,
	callbacks: {
		async signIn({ user }) {
			try {
				const { email } = user;
				const gauzyLoginUser = await signWithSocialLoginsRequest(email ?? '');
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

		async jwt({ token, user }) {
			if (user) {
				const { email } = user;
				const gauzyLoginUser = await signWithSocialLoginsRequest(email ?? '');
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
					access_token: data.token,
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
			return token;
		},
		session({ session, token }) {
			session.user = token.authCookie as any;
			return session;
		}
	}
});
