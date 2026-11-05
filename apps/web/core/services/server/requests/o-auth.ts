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
import { APP_NAME, VERIFY_EMAIL_CALLBACK_PATH } from '@/core/constants/config/constants';
import { signinService } from '../../client/api/auth/signin.service';
import { userOrganizationService } from '../../client/api/users/user-organization.service';
import { EProvider } from '@/core/types/generics/enums/social-accounts';
import { everIdUserByAccount, isEverIdCallbackRequest } from '@/core/services/server/ever-id/sign-in';
import { pickTokenOrganization } from '@/core/lib/auth/jwt-utils';
import { unwrapRejection } from '@/core/services/server/fetch';

export function GauzyAdapter(req: NextRequest): Adapter {
	return {
		createUser: async (user): Promise<any> => {
			// The Ever ID sign-in never creates an account itself (an account comes only from a sign-up the person confirms)
			if (isEverIdCallbackRequest(req)) {
				throw new Error('Ever ID sign-in does not create accounts');
			}
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

			// Gauzy keeps a self-registration inactive until its e-mail link is opened (owner decision 4,
			// ever-co/ever-gauzy#11341): a login now answers 401. The account exists and the link is on its way; the
			// workspace is set up at the first sign-in after the confirmation (finish-signup.ts).
			if ((createdUser.data as { isActive?: boolean } | undefined)?.isActive === false) {
				return createdUser.data;
			}

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
					startedWorkOn: new Date(),
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
			// Ever ID: the Gauzy user the ID token exchange resolved (the link itself lives in the Gauzy API)
			if (providerAccountId.provider === EProvider.EVER_ID) {
				return everIdUserByAccount(providerAccountId.providerAccountId);
			}
			const response = await signinGetSocialUserByProviderIdRequest(providerAccountId);
			if (!response.data.isUserExists) return null;
			return response.data;
		},

		updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<any> => {
			return user;
		},

		linkAccount: async (account: AdapterAccount) => {
			// Ever ID links are made in the Gauzy API, never here
			if (account.provider === EProvider.EVER_ID) {
				return null;
			}
			const { provider, access_token: token } = account;
			if (provider && token) {
				return (await linkUserToSocialAccount({ provider: provider as EProvider, token }))
					.data as unknown as AdapterAccount;
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

const ACCOUNT_NOT_SET_UP = 'account-not-set-up';
const RECOGNIZED_ACCOUNT_FAILED = 'recognized-account-failed';

async function signInRecognizedAccount(email: string, workspaceToken: string) {
	const data = await signinService.signInWorkspace({ email, token: workspaceToken });
	const tenantId = data.user?.tenantId || '';
	const token = data.token;
	const userId = data.user?.id;

	const { data: organizations } = await userOrganizationService.getUserOrganizations({
		tenantId,
		userId,
		token
	});
	return { data, organizations, tenantId, token, userId };
}

async function signIn(provider: EProvider, access_token: string) {
	try {
		const gauzyUser = await signWithSocialLoginsRequest(provider, access_token);

		if (!gauzyUser) {
			return Promise.reject({
				reason: ACCOUNT_NOT_SET_UP,
				errors: {
					email: 'Your account isn’t fully set up yet'
				}
			});
		}

		const workspaceToken = gauzyUser.data?.workspaces?.[0]?.token;
		if (!workspaceToken) {
			return Promise.reject({
				reason: ACCOUNT_NOT_SET_UP,
				errors: {
					email: 'Your account isn’t fully set up yet'
				}
			});
		}

		let signedIn: Awaited<ReturnType<typeof signInRecognizedAccount>>;
		try {
			signedIn = await signInRecognizedAccount(gauzyUser.data.confirmed_email, workspaceToken);
		} catch (error) {
			return Promise.reject({ reason: RECOGNIZED_ACCOUNT_FAILED, cause: error });
		}
		const { data, organizations, tenantId, token, userId } = signedIn;

		const organization = pickTokenOrganization(organizations?.items, token);

		if (!organization) {
			return Promise.reject({
				reason: ACCOUNT_NOT_SET_UP,
				errors: {
					email: `Your account is not yet ready to be used on the ${APP_NAME} Platform`
				}
			});
		}
		return { data, gauzyUser, organization, tenantId, token, userId };
	} catch (error) {
		throw new Error('Signin error', { cause: error });
	}
}

// Gauzy sends no reason code with this 401, only its fixed message (ever-gauzy social-signin-verified-account.ts).
const UNCONFIRMED_ACCOUNT_MESSAGE = /confirm the email address of your account/i;

export const PROVIDER_ACCOUNT_UNCONFIRMED_PATH = '/auth/error?error=ProviderAccountUnconfirmed';

export const PROVIDER_ACCOUNT_NOT_SET_UP_PATH = '/auth/error?error=ProviderAccountNotSetUp';

// The generic "Something went wrong, try again" page: a transient failure once Gauzy recognized the account.
export const PROVIDER_SIGN_IN_FAILED_PATH = '/auth/error?error=Configuration';

type GauzyRefusal = { statusCode?: unknown; message?: unknown } | null | undefined;

function signInRejectionOf(error: unknown): unknown {
	if (error instanceof Error) {
		return error.cause;
	}
	return error;
}

function signInRefusalReasonOf(error: unknown): unknown {
	const rejection = signInRejectionOf(error) as { reason?: unknown } | null | undefined;
	return rejection?.reason;
}

async function isUnconfirmedAccountRefusal(error: unknown): Promise<boolean> {
	const rejection = signInRejectionOf(error);
	const body = (await unwrapRejection(rejection)) as GauzyRefusal;
	const isUnauthorized = body?.statusCode === 401;
	const message = String(body?.message ?? '');
	const asksToConfirmTheAddress = UNCONFIRMED_ACCOUNT_MESSAGE.test(message);
	return isUnauthorized && asksToConfirmTheAddress;
}

/**
 * next-auth's signIn answer for a provider other than Ever ID. A refusal of the provider sign-in itself still lets
 * next-auth go on: for an address Gauzy does not know, the adapter registers the account (the provider sign-up). Once
 * the address has an account (unconfirmed, recognized but without a workspace, or recognized and then failing), the
 * sign-in stops here, or the adapter registers a second account for it.
 */
export async function signInCallback(provider: EProvider, access_token: string): Promise<true | string> {
	try {
		await signIn(provider, access_token);
	} catch (error) {
		if (await isUnconfirmedAccountRefusal(error)) {
			return PROVIDER_ACCOUNT_UNCONFIRMED_PATH;
		}
		const reason = signInRefusalReasonOf(error);
		if (reason === ACCOUNT_NOT_SET_UP) {
			return PROVIDER_ACCOUNT_NOT_SET_UP_PATH;
		}
		if (reason === RECOGNIZED_ACCOUNT_FAILED) {
			return PROVIDER_SIGN_IN_FAILED_PATH;
		}
	}
	return true;
}

export async function jwtCallback(provider: EProvider, access_token: string) {
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
