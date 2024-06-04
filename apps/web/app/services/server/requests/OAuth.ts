import { AdapterAccount, AdapterSession, AdapterUser, type Adapter } from '@auth/core/adapters';
import { registerUserRequest, signWithSocialLoginsRequest } from '@app/services/server/requests';
import { getUserOrganizationsRequest, signInWorkspaceAPI } from '@app/services/client/api/auth/invite-accept';
// import { Awaitable } from '@auth/core/types';
// import { IUser } from '@app/interfaces';

export enum ProviderEnum {
	GITHUB = 'github',
	GOOGLE = 'google',
	FACEBOOK = 'facebook',
	TWITTER = 'twitter'
}

export function GauzyAdapter(): Adapter {
	return {
		createUser: async (user): Promise<any> => {
			const { email, name } = user;
			const [firstName, lastName] = name ? name.split(' ') : [];
			const createdUser = await registerUserRequest({
				password: 'gloiresalva',
				confirmPassword: 'gloiresalva',
				user: { email, firstName, lastName, timeZone: '' }
			});
			return createdUser;
		},

		getUser: async (id): Promise<any> => {
			return null;
		},

		getUserByEmail: async (email): Promise<any> => {
			// const response = await fetch(`http://localhost:3000/api/user/email/${email}`, { method: 'GET' });
			// const user = await response.json();
			// console.log('Existed user', user);
			// return user || null;
			return null;
		},

		getUserByAccount: async (
			providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
		): Promise<any> => {
			return null;
		},

		updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<any> => {
			return user;
		},

		linkAccount: async (account: AdapterAccount) => {
			return account;
		},

		createSession: async (session: { sessionToken: string; userId: string; expires: Date }) => {
			return session;
		},

		getSessionAndUser: async (sessionToken: string): Promise<any> => {
			return sessionToken;
		},

		updateSession: async (
			session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>
		): Promise<any> => {
			return session;
		},

		deleteSession: async (sessionToken: string): Promise<any> => {
			return sessionToken;
		}
	};
}

async function signIn(provider: ProviderEnum, access_token: string) {
	try {
		const gauzyUser = await signWithSocialLoginsRequest(provider, access_token);

		if (!gauzyUser) {
			return Promise.reject({
				errors: {
					email: 'Your account is not yet ready to be used on the Ever Teams Platform'
				}
			});
		}

		const data = await signInWorkspaceAPI(gauzyUser?.data.confirmed_email, gauzyUser?.data.workspaces[0].token);
		const tenantId = data.user?.tenantId || '';
		const token = data.token;
		const userId = data.user?.id;

		const { data: organizations } = await getUserOrganizationsRequest({
			tenantId,
			userId,
			token
		});

		const organization = organizations?.items[0];

		if (!organization) {
			return Promise.reject({
				errors: {
					email: 'Your account is not yet ready to be used on the Ever Teams Platform'
				}
			});
		}
		return { data, gauzyUser, organization, tenantId, userId };
	} catch (error) {
		throw new Error('Signin error', { cause: error });
	}
}

export async function signInCallback(provider: ProviderEnum, access_token: string): Promise<boolean> {
	try {
		const { gauzyUser, organization } = await signIn(provider, access_token);
		return !!gauzyUser && !!organization;
	} catch (error: any) {
		return false;
	}
}

export async function jwtCallback(provider: ProviderEnum, access_token: string) {
	try {
		const { data, gauzyUser, organization, tenantId, userId } = await signIn(provider, access_token);
		return {
			access_token,
			refresh_token: {
				token: data.refresh_token
			},
			teamId: gauzyUser?.data.workspaces[0].current_teams[0].team_id,
			tenantId,
			organizationId: organization?.organizationId,
			languageId: 'en',
			noTeamPopup: true,
			userId,
			workspaces: gauzyUser?.data.workspaces,
			confirmed_mail: gauzyUser?.data.confirmed_email
		};
	} catch (error) {
		throw new Error('Signin error', { cause: error });
	}
}
