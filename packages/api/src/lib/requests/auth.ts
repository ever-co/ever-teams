import { IAuthLogin, IAuthWithEmailPassword, IServerError, IUser } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';
import { IApiRequestConfig } from '../config/api-config';
import { createTenant } from './tenant';
import { createDefaultOrganisationTeam } from './organization';
import { createEmployee } from './employee';
import { refreshToken } from './refresh-token';

export const authWithEmailPassword = async (
	{
		email,
		password,
		includeTeams = true
	}: {
		email: string;
		password: string;
		includeTeams?: boolean;
	},
	api?: IApiRequestConfig
) => {
	try {
		const response = await ApiCall<IAuthWithEmailPassword>(
			{
				path: '/auth/signin.email.password',
				method: 'POST',
				body: {
					email,
					password,
					includeTeams
				}
			},
			api
		);

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { message: (error as Error).message } as IServerError;
	}
};

export const authLogin = async ({ email, password }: { email: string; password: string }, api?: IApiRequestConfig) => {
	try {
		const response = await ApiCall<IAuthLogin>(
			{
				path: '/auth/login',
				method: 'POST',
				body: {
					email,
					password
				}
			},
			api
		);

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { message: (error as Error).message } as IServerError;
	}
};

// A step of a sign-in that answers the session: the session, or the API's refusal as the other sign-in requests
// return it (with its status; without one when no answer came).
const sessionRequest = async (path: string, body: Record<string, unknown>, api?: IApiRequestConfig) => {
	try {
		const response = await ApiCall<IAuthLogin>({ path, method: 'POST', body }, api);
		if ('data' in response) {
			return response.data;
		}
		return response;
	} catch (error) {
		return { message: (error as Error).message } as IServerError;
	}
};

/**
 * Completes a sign-in that the API answered with `TWO_FACTOR_REQUIRED`: the challenge it gave, with the code of the
 * person's authenticator app or one of their recovery codes. Answers the session, as `authLogin` does.
 */
export const authVerifyTwoFactor = (
	{ challenge, code, recoveryCode }: { challenge: string; code?: string; recoveryCode?: string },
	api?: IApiRequestConfig
) => sessionRequest('/auth/two-factor/verify', { challenge, code, recoveryCode }, api);

export const authSignUp = async (
	{
		fullName,
		email,
		password,
		confirmPassword
	}: {
		fullName: string;
		email: string;
		password: string;
		confirmPassword: string;
	},
	api?: IApiRequestConfig
) => {
	try {
		const names = fullName.split(' ');
		const firstName = names[0];
		const lastName = names.length > 1 ? names.slice(1).join(' ') : null;

		const response = await ApiCall<IUser>(
			{
				path: '/auth/register',
				method: 'POST',
				body: {
					user: {
						firstName,
						lastName,
						email,
						preferredLanguage: 'en'
					},
					password,
					confirmPassword
				}
			},
			api
		);
		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { message: (error as Error).message } as IServerError;
	}
};

export interface ICompleteAccountSetup {
	fullName: string;
	email: string;
	password: string;
	confirmPassword: string;
	tenantName?: string; // Optional: defaults to email prefix
}

/**
 * Creates a complete Teams account with full organizational setup
 *
 * @param params - Account setup parameters
 * @returns IAuthLogin on success, IServerError on failure
 */
export const createCompleteAccount = async (
	params: ICompleteAccountSetup,
	api?: IApiRequestConfig
): Promise<IAuthLogin | IServerError> => {
	const { fullName, email, password, confirmPassword, tenantName } = params;

	try {
		// Step 1: Create user account
		const signUpResult = await authSignUp({ fullName, email, password, confirmPassword }, api);

		if ('error' in signUpResult || 'message' in signUpResult) {
			return signUpResult as IServerError;
		}

		// Step 2: Login to get authentication token
		const loginResult = await authLogin({ email, password }, api);

		if ('error' in loginResult || 'message' in loginResult) {
			return loginResult as IServerError;
		}

		// Steps 3-7: tenant, organization + team, employee, refreshed token (nothing for a user with a tenant)
		return await finishAccountSetup(loginResult, tenantName || email.split('@')[0], api);
	} catch (error) {
		return {
			error: 'Account setup failed',
			message: (error as Error).message
		} as IServerError;
	}
};

export const logOut = async (token?: string, api?: IApiRequestConfig) => {
	try {
		await ApiCall<{ user: string }>(
			{
				path: '/auth/logout',
				method: 'GET',
				bearer_token: token
			},
			api
		);
	} catch (error) {
		return {
			error: 'Logout failed',
			message: (error as Error).message
		} as IServerError;
	}
};

/**
 * Finishes the Teams setup of a signed-in account: for a user without a tenant (a sign-up whose setup never ran or
 * stopped early), creates the tenant, the default organization + team and the employee, then refreshes the token so it
 * carries them. A user who has a tenant is answered as is. `createCompleteAccount` runs it after the sign-up.
 *
 * @param loginResult - The answer of `authLogin` for the account
 * @param tenantName - The name of the tenant to create
 * @returns IAuthLogin (with the refreshed token after a setup) on success, IServerError on failure
 */
export const finishAccountSetup = async (
	loginResult: IAuthLogin,
	tenantName: string,
	api?: IApiRequestConfig
): Promise<IAuthLogin | IServerError> => {
	try {
		// Step 3: Check if user already has tenant (existing user case)
		if (loginResult.user.tenantId) {
			return loginResult; // User already has complete setup
		}

		// Step 4: Create tenant
		const tenant = await createTenant(
			{
				tenantName,
				token: loginResult.token
			},
			api
		);

		if ('error' in tenant || 'message' in tenant) {
			return tenant as IServerError;
		}

		// Step 5: Create default organization
		const organization = await createDefaultOrganisationTeam(
			{
				tenant,
				token: loginResult.token
			},
			api
		);

		if ('error' in organization || 'message' in organization) {
			return organization as IServerError;
		}

		// Step 6: Create employee record
		const employee = await createEmployee(
			{
				organizationId: organization.id,
				userId: loginResult.user.id,
				tenantId: tenant.id,
				token: loginResult.token
			},
			api
		);

		if ('error' in employee || 'message' in employee) {
			return employee as IServerError;
		}

		// Step 7 : Refresh the token
		const newToken = await refreshToken({ refresh_token: loginResult.refresh_token }, api);

		if ('error' in newToken || 'message' in newToken) {
			return newToken as IServerError;
		}
		if (!newToken.token) {
			return { error: 'Failed to refresh token' } as IServerError;
		}

		// Success: Return the login result with complete setup
		return {
			...loginResult,
			token: newToken.token
		};
	} catch (error) {
		return {
			error: 'Account setup failed',
			message: (error as Error).message
		} as IServerError;
	}
};
