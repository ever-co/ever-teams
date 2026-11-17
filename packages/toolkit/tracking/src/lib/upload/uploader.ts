import { ITeamsConfig } from '../types';

export const DEFAULT_TEAMS_API_URL = 'https://api.ever.team/api';

export const createUploader = (config: ITeamsConfig) => {
	return async (data: string) => {
		const { tenantId, organizationId, token: bearer_token, apiUrl } = config;
		// Without an apiUrl, recordings go to the same default API as the rest of the kit (@ever-teams/api), never to
		// another server: they carry the user's token.
		const TEAMS_API_URL = apiUrl || DEFAULT_TEAMS_API_URL;

		try {
			const headers: HeadersInit = {
				Accept: '*/*'
			};

			if (bearer_token) {
				headers['authorization'] = `Bearer ${bearer_token}`;
			}

			if (tenantId) {
				headers['tenant-id'] = tenantId;
			}

			if (organizationId) {
				headers['organization-id'] = organizationId;
			}

			// Add Content-Type header for JSON body
			headers['Content-Type'] = 'application/json';

			const response = await fetch(TEAMS_API_URL + '/timesheet/custom-tracking', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					payload: data,
					tenantId,
					organizationId,
					startTime: new Date().toISOString()
				})
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Error uploading data:', error);
			throw error;
		}
	};
};
