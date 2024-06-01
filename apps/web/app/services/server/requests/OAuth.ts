import { type Adapter } from '@auth/core/adapters';
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

export const GauzyAdapter: Adapter = {
	async createUser(user): Promise<any> {
		const { email, name } = user;
		const [firstName, lastName] = name ? name.split(' ') : [];
		const createdUser = await registerUserRequest({
			password: '',
			confirmPassword: '',
			user: { email, firstName, lastName, timeZone: '' }
		});
		return createdUser.data;
	},
	async getUser(id): Promise<any> {
		return id;
	}
};

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
	} catch (error) {
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
