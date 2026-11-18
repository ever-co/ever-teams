import { IProject, IServerError } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

export type EmbedProject = Pick<IProject, 'id' | 'name'>;

/** A read with no list to show: it got no answer (the network failed), or an answer that is not a list. No status. */
export interface EmbedProjectsUnread {
	message: string;
	statusCode?: undefined;
	error?: undefined;
}

export type EmbedProjectsAnswer = EmbedProject[] | IServerError | EmbedProjectsUnread;

function messageOf(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

/**
 * The projects a token from the host's `getToken` may track time on, sorted by name: the client's projects for a portal
 * limited to a client, the member's projects otherwise. An API without this route answers 404, or 403 from its embed
 * guard: the error returned keeps that `statusCode` (and the `code` of the body). The tenant goes in the `Tenant-Id`
 * header, as the API's tenant routes require. A read that gets no answer, or an answer that is not a list, comes back
 * as a message with no status.
 */
export const getEmbedProjects = async (token: string, tenantId: string): Promise<EmbedProjectsAnswer> => {
	try {
		const response = await ApiCall<unknown>({
			path: '/embed/projects',
			method: 'GET',
			bearer_token: token,
			tenantId
		});

		if ('data' in response) {
			if (Array.isArray(response.data)) {
				return response.data as EmbedProject[];
			}
			return { message: 'The API answered the embed projects with no list.' };
		}

		return response;
	} catch (error) {
		return { message: messageOf(error) };
	}
};
