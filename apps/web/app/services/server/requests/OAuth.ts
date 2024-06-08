import { AdapterAccount, AdapterSession, AdapterUser, type Adapter } from '@auth/core/adapters';
import {
	singinGetUserBySocialEmailRequest,
	singinGetSocialUserByProviderIdRequest,
	registerUserRequest,
	signWithSocialLoginsRequest,
	loginUserRequest,
	createTenantRequest,
	createTenantSmtpRequest,
	createOrganizationRequest,
	createEmployeeFromUser,
	createOrganizationTeamRequest,
	refreshTokenRequest
} from '@app/services/server/requests';
import { getUserOrganizationsRequest, signInWorkspaceAPI } from '@app/services/client/api/auth/invite-accept';
import { generateToken, setAuthCookies } from '@app/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { VERIFY_EMAIL_CALLBACK_PATH } from '@app/constants';
// import { Awaitable } from '@auth/core/types';
// import { IUser } from '@app/interfaces';

export enum ProviderEnum {
	GITHUB = 'github',
	GOOGLE = 'google',
	FACEBOOK = 'facebook',
	TWITTER = 'twitter'
}

export function GauzyAdapter(req: NextRequest): Adapter {
	return {
		createUser: async (user): Promise<any> => {
			console.log('CREATE USER ADAPTER');
			const url = new URL(req.url);
			const response = new NextResponse();

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

			console.log('Creation user', { createdUser });

			// User Login, get the access token
			const { data: loginRes } = await loginUserRequest(email, password);
			let auth_token = loginRes.token;

			console.log('User login', { loginRes });

			// Create user tenant
			const { data: tenant } = await createTenantRequest(firstName, auth_token);

			console.log('Createed Tenant', { tenant });

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

			console.log('Creation organization', { organization });

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

			console.log('Creation employee', { employee });

			// Create user organization team
			const { data: team } = await createOrganizationTeamRequest(
				{
					name: firstName,
					tenantId: tenant.id,
					organizationId: organization.id,
					managerIds: [employee.id],
					public: true // By default team should be public,
				},
				auth_token
			);

			console.log('Creation team', { team });

			const { data: refreshTokenRes } = await refreshTokenRequest(loginRes.refresh_token);
			auth_token = refreshTokenRes.token;

			console.log('Creation refreshTokenRes', { refreshTokenRes });

			setAuthCookies(
				{
					access_token: auth_token,
					refresh_token: {
						token: loginRes.refresh_token
					},
					timezone: '',
					teamId: team.id,
					tenantId: tenant.id,
					organizationId: organization.id,
					languageId: 'en', // TODO: not sure what should be here
					userId: user.id
				},
				{ req, res: response }
			);

			return createdUser;
		},

		getUser: async (id): Promise<any> => {
			return null;
		},

		getUserByEmail: async (email): Promise<any> => {
			console.log('GET USER BY EMAIL ADAPTER');
			const response = await singinGetUserBySocialEmailRequest({ email });
			if (!response.data.isUserExists) return null;
			return response.data;
		},

		getUserByAccount: async (
			providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
		): Promise<any> => {
			console.log('GET USER BY ACCOUNT ADAPTER');
			const response = await singinGetSocialUserByProviderIdRequest(providerAccountId);
			if (!response.data.isUserExists) return null;
			return response.data;
		},

		updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<any> => {
			return user;
		},

		linkAccount: async (account: AdapterAccount) => {
			console.log('LINK ACCOUNT ADAPTER');
			return account;
		},

		createSession: async (session: { sessionToken: string; userId: string; expires: Date }) => {
			console.log('CREATE SESSION ADAPTER');
			return session;
		},

		getSessionAndUser: async (sessionToken: string): Promise<any> => {
			console.log('GET SESSION ADAPTER');
			return sessionToken;
		},

		updateSession: async (
			session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>
		): Promise<any> => {
			console.log('UPDATE SESSION ADAPTER');
			return session;
		},

		deleteSession: async (sessionToken: string): Promise<any> => {
			console.log('DELETE SESSION ADAPTER');
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
