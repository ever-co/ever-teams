import { IProject, IServerError } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

export type EmbedProject = Pick<IProject, 'id' | 'name'>;

function messageOf(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

/**
 * The projects a token from the host's `getToken` may track time on, sorted by name: the client's projects for a portal
 * limited to a client, the member's projects otherwise. An API without this route answers 404, or 403 from its embed
 * guard: the error returned keeps that `statusCode`. The tenant goes in the `Tenant-Id` header, as the API's tenant
 * routes require.
 */
export const getEmbedProjects = async (token: string, tenantId: string): Promise<EmbedProject[] | IServerError> => {
	try {
		const response = await ApiCall<EmbedProject[]>({
			path: '/embed/projects',
			method: 'GET',
			bearer_token: token,
			tenantId
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { message: 'Unexpected error format.' } as IServerError;
	} catch (error) {
		return { message: messageOf(error) } as IServerError;
	}
};
