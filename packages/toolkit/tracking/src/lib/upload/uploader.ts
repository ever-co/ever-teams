import { ITeamsConfig } from '../types';

export const createUploader = (config: ITeamsConfig) => {
	return async (data: string) => {
		const { tenantId, organizationId, token: bearer_token, apiUrl } = config;
		const TEAMS_API_URL = apiUrl || 'https://apidemo.gauzy.co/api'; // Default to demo API if not provided (https://apidemo.gauzy.co/api)

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
