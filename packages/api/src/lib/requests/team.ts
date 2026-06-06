import QueryString from 'qs';
import { ApiCall } from '../fetch';
import { IOrganizationTeamList, IServerError, IUser, OT_Member, PaginationResponse, RoleName } from '@ever-teams/toolkit-types';

interface TeamCreationFormValues {
	teamName: string;
	description?: string;
}

/**
 * Creates a new team within an organization.
 *
 * @param params - The parameters required to create a team.
 * @param params.currentUser - The currently authenticated user. Must not be null.
 * @param params.token - The authentication token for the API request.
 * @param params.organizationId - The ID of the organization where the team will be created.
 * @param params.formData - The form data containing the team creation details.
 * @returns A promise that resolves to the created team data if successful, or an error object if the operation fails.
 *
 * @throws Will throw an error if the user is not authenticated.
 */
export const createTeam = async ({
	currentUser,
	token,
	organizationId,
	formData
}: {
	currentUser: IUser | null;
	token: string;
	organizationId: string;
	formData: TeamCreationFormValues;
}) => {
	try {
		if (!currentUser) {
			throw new Error('User is not authenticated');
		}

		const { tenantId } = currentUser;

		const response = await ApiCall<IOrganizationTeamList>({
			path: `/organization-team`,
			method: 'POST',
			bearer_token: token,
			tenantId,
			organizationId,
			body: {
				name: formData.teamName,
				managerIds: [currentUser.id],
				tenantId,
				organizationId
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
		return { error: (error as Error).message } as IServerError;
	}
};

/**
 * Fetches the details of an organization team by its ID.
 *
 * @param params - The parameters required to fetch the organization team.
 * @param params.teamId - The ID of the team to retrieve.
 * @param params.currentUser - The currently authenticated user. Must not be null.
 * @param params.token - The authentication token for the API call.
 * @param params.organizationId - The ID of the organization to which the team belongs.
 *
 * @returns A promise that resolves to the team details if successful, or an error object if the operation fails.
 *
 * @throws Will throw an error if the `currentUser` is null, indicating the user is not authenticated.
 */
export const getOrganizationTeam = async ({
	teamId,
	currentUser,
	token,
	organizationId
}: {
	teamId: string;
	currentUser: IUser | null;
	token: string;
	organizationId: string;
}) => {
	try {
		if (!currentUser) {
			throw new Error('User is not authenticated');
		}

		const { tenantId } = currentUser;

		const query = QueryString.stringify({
			tenantId,
			organizationId
		});

		const response = await ApiCall<IOrganizationTeamList>({
			path: `/organization-team/${teamId}?${query}`,
			method: 'GET',
			bearer_token: token,
			tenantId,
			organizationId
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

interface IUpdateTeamValues {
	teamId: string;
	name?: string;
	managerIds?: string[];
	memberIds?: string[];
	tags?: string[];
	color?: string;
	teamSize?: string;
	public?: boolean;
	imageId?: string;
}

/**
 * Updates an existing team in the organization.
 *
 * @param {Object} params - The parameters for the update operation.
 * @param {IUser | null} params.currentUser - The currently authenticated user. Must not be null.
 * @param {string} params.token - The authentication token for the API request.
 * @param {string} params.organizationId - The ID of the organization to which the team belongs.
 * @param {IUpdateTeamValues} params.data - The data to update the team with, including team ID, name, manager IDs, member IDs, and tags.
 *
 * @returns {Promise<IOrganizationTeamList | IServerError>} A promise that resolves to the updated team data if successful,
 * or an error object if the operation fails.
 *
 * @throws {Error} Throws an error if the user is not authenticated.
 */

export const updateTeam = async ({
	currentUser,
	token,
	organizationId,
	data
}: {
	currentUser: IUser | null;
	token: string;
	organizationId: string;
	data: IUpdateTeamValues;
}) => {
	try {
		if (!currentUser) {
			throw new Error('User is not authenticated');
		}

		const { tenantId } = currentUser;
		const { teamId: id, ...optionalFields } = data;

		const body: {
			id: string;
			tenantId: string;
			organizationId: string;
			name?: string;
			managerIds?: string[];
			memberIds?: string[];
			tags?: string[];
			color?: string;
			teamSize?: string;
			public?: boolean;
			imageId?: string;
		} = {
			id,
			tenantId,
			organizationId
		};

		// Dynamically add optional fields if they exist
		Object.entries(optionalFields).forEach(([key, value]) => {
			if (value) {
				(body as any)[key] = value;
			}
		});

		const response = await ApiCall<IOrganizationTeamList>({
			path: `/organization-team/${id}`,
			method: 'PUT',
			bearer_token: token,
			tenantId,
			organizationId,
			body
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

interface SendInvitationProps {
	user: IUser | null;
	token: string;
	organizationId: string;
	roleId: string;
	teamId: string;
	formData: FormValues;
}

interface FormValues {
	email: string;
	name: string;
	roleName: RoleName;
}

export const sendTeamInvitation = async ({
	user,
	token,
	organizationId,
	roleId,
	teamId,
	formData: data
}: SendInvitationProps) => {
	try {
		if (!user) {
			throw new Error('User is not authenticated');
		}

		const { tenantId } = user;
		const { email, name } = data;

		const body = {
			emailIds: [email],
			projectIds: [],
			departmentIds: [],
			organizationContactIds: [],
			teamIds: [teamId],
			roleId: roleId,
			invitationExpirationPeriod: 'Never',
			inviteType: 'TEAM',
			appliedDate: null,
			fullName: name,
			callbackUrl: 'https://app.ever.team/auth/passcode', // to be replaced with Teams callback URL
			organizationId,
			tenantId,
			startedWorkOn: new Date().toISOString()
		};

		const response = await ApiCall<PaginationResponse<OT_Member> & { ignored: number }>({
			path: `/invite/emails`,
			method: 'POST',
			bearer_token: token,
			tenantId,
			body
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};
