import { IAuthLogin, IAuthWithEmailPassword, IServerError, IUser } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';
import { createTenant } from './tenant';
import { createDefaultOrganisationTeam } from './organization';
import { createEmployee } from './employee';
import { refreshToken } from './refresh-token';

export const authWithEmailPassword = async ({
	email,
	password,
	includeTeams = true
}: {
	email: string;
	password: string;
	includeTeams?: boolean;
}) => {
	try {
		const response = await ApiCall<IAuthWithEmailPassword>({
			path: '/auth/signin.email.password',
			method: 'POST',
			body: {
				email,
				password,
				includeTeams
			}
		});

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

export const authLogin = async ({ email, password }: { email: string; password: string }) => {
	try {
		const response = await ApiCall<IAuthLogin>({
			path: '/auth/login',
			method: 'POST',
			body: {
				email,
				password
			}
		});

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

export const authSignUp = async ({
	fullName,
	email,
	password,
	confirmPassword
}: {
	fullName: string;
	email: string;
	password: string;
	confirmPassword: string;
}) => {
	try {
		const names = fullName.split(' ');
		const firstName = names[0];
		const lastName = names.length > 1 ? names.slice(1).join(' ') : null;

		const response = await ApiCall<IUser>({
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
		});
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
export const createCompleteAccount = async (params: ICompleteAccountSetup): Promise<IAuthLogin | IServerError> => {
	const { fullName, email, password, confirmPassword, tenantName } = params;

	try {
		// Step 1: Create user account
		const signUpResult = await authSignUp({ fullName, email, password, confirmPassword });

		if ('error' in signUpResult || 'message' in signUpResult) {
			return signUpResult as IServerError;
		}

		// Step 2: Login to get authentication token
		const loginResult = await authLogin({ email, password });

		if ('error' in loginResult || 'message' in loginResult) {
			return loginResult as IServerError;
		}

		// Step 3: Check if user already has tenant (existing user case)
		if (loginResult.user.tenantId) {
			return loginResult; // User already has complete setup
		}

		// Step 4: Create tenant
		const tenant = await createTenant({
			tenantName: tenantName || email.split('@')[0],
			token: loginResult.token
		});

		if ('error' in tenant || 'message' in tenant) {
			return tenant as IServerError;
		}

		// Step 5: Create default organization
		const organization = await createDefaultOrganisationTeam({
			tenant,
			token: loginResult.token
		});

		if ('error' in organization || 'message' in organization) {
			return organization as IServerError;
		}

		// Step 6: Create employee record
		const employee = await createEmployee({
			organizationId: organization.id,
			userId: loginResult.user.id,
			tenantId: tenant.id,
			token: loginResult.token
		});

		if ('error' in employee || 'message' in employee) {
			return employee as IServerError;
		}

		// Step 7 : Refresh the token
		const newToken = await refreshToken({ refresh_token: loginResult.refresh_token });

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

export const logOut = async (token?: string) => {
	try {
		await ApiCall<{ user: string }>({
			path: '/auth/logout',
			method: 'GET',
			bearer_token: token
		});
	} catch (error) {
		return {
			error: 'Logout failed',
			message: (error as Error).message
		} as IServerError;
	}
};
