import { IMember, IServerError, IUser, PaginationResponse } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

export const getMembers = async (
	user: IUser | null,
	token: string,
	organizationId: string,
	interval: { start: Date; end: Date }
) => {
	const { start, end } = interval;
	try {
		if (!user) throw new Error('User is not authenticated');

		const { tenantId } = user;

		const json = {
			organizationId,
			tenantId,
			forRange: {
				startDate: start.toISOString(),
				endDate: end.toISOString(),
				isCustomDate: false
			},
			withUser: true
		};

		const query = JSON.stringify({
			findInput: json
		});

		const response = await ApiCall<PaginationResponse<IMember>>({
			path: `/employee/working?data=${query}`,
			method: 'GET',
			bearer_token: token,
			tenantId,
			organizationId
		});

		if ('data' in response) return response.data;

		if ('error' in response || 'message' in response) return response;

		return { message: 'Unexpected error format.' } as IServerError;
	} catch (error) {
		return { message: error instanceof Error ? error.message : String(error) } as IServerError;
	}
};
