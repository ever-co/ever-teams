import { AdapterAccount, AdapterSession, AdapterUser, type Adapter } from '@auth/core/adapters';
import {
	signinGetSocialUserByProviderIdRequest,
	registerUserRequest,
	signWithSocialLoginsRequest,
	loginUserRequest,
	createTenantRequest,
	createTenantSmtpRequest,
	createOrganizationRequest,
	createEmployeeFromUser,
	createOrganizationTeamRequest,
	refreshTokenRequest,
	linkUserToSocialAccount
} from '@/core/services/server/requests';
import { generateToken } from '@/core/lib/helpers/index';
import { NextRequest } from 'next/server';
import { VERIFY_EMAIL_CALLBACK_PATH } from '@/core/constants/config/constants';
import { signinService } from '../../client/api/auth/signin.service';
import { userOrganizationService } from '../../client/api/user-organization.service';

export enum ProviderEnum {
	GITHUB = 'github',
	GOOGLE = 'google',
	FACEBOOK = 'facebook',
	TWITTER = 'twitter'
}

export function GauzyAdapter(req: NextRequest): Adapter {
	return {
		createUser: async (user): Promise<any> => {
			const url = new URL(req.url);

			const { email, name } = user;
			const [firstName, lastName] = name ? name.split(' ') : [];
			// General a random password with 8 chars
			const password = generateToken(8);

			const appEmailConfirmationUrl = `${url.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;
			const createdUser = await registerUserRequest({
				password,
				confirmPassword: password,
				user: { email, firstName, lastName, timeZone: '' },
				appEmailConfirmationUrl
			});

			// User Login, get the access token
			const { data: loginRes } = await loginUserRequest(email, password);
			const auth_token = loginRes.token;

			// Create user tenant
			const { data: tenant } = await createTenantRequest(firstName, auth_token);

			// Create tenant SMTP
			await createTenantSmtpRequest({
				access_token: auth_token,
				tenantId: tenant.id
			});

			// Create user organization
			const { data: organization } = await createOrganizationRequest(
				{
					currency: 'USD',
					name: firstName,
					tenantId: tenant.id,
					invitesAllowed: true
				},
				auth_token
			);

			// Create employee
			const { data: employee } = await createEmployeeFromUser(
				{
					organizationId: organization.id,
					startedWorkOn: new Date().toISOString(),
					tenantId: tenant.id,
					userId: createdUser.data.id
				},
				auth_token
			);

			// Create user organization team
			await createOrganizationTeamRequest(
				{
					name: firstName,
					tenantId: tenant.id,
					organizationId: organization.id,
					managerIds: [employee.id],
					public: true
				},
				auth_token
			);

			await refreshTokenRequest(loginRes.refresh_token);

			// await verifyUserEmailByTokenRequest({ email, token: loginRes.token });

			return createdUser.data;
		},

		getUser: async (): Promise<any> => {
			return null;
		},

		getUserByEmail: async (): Promise<any> => {
			return null;
		},

		getUserByAccount: async (
			providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
		): Promise<any> => {
			const response = await signinGetSocialUserByProviderIdRequest(providerAccountId);
			if (!response.data.isUserExists) return null;
			return response.data;
		},

		updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<any> => {
			return user;
		},

		linkAccount: async (account: AdapterAccount) => {
			const { provider, access_token: token } = account;
			if (provider && token) {
				return (await linkUserToSocialAccount({ provider: provider as ProviderEnum, token }))
					.data as AdapterAccount;
			}
			return null;
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

		const data = await signinService.signInWorkspace({
			email: gauzyUser?.data.confirmed_email,
			token: gauzyUser?.data.workspaces[0].token
		});
		const tenantId = data.user?.tenantId || '';
		const token = data.token;
		const userId = data.user?.id;

		const { data: organizations } = await userOrganizationService.getUserOrganizations({
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
		return { data, gauzyUser, organization, tenantId, token, userId };
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
		const { data, gauzyUser, organization, tenantId, token, userId } = await signIn(provider, access_token);
		return {
			access_token: token,
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
