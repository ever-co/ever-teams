import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import axios, { AxiosResponse } from 'axios';

/**
 * Health check API function that intelligently chooses between local and remote endpoints
 *
 * Local (Next.js): /api/health → calls Gauzy API and returns formatted response
 * Remote (Gauzy): /api/health → returns direct health status
 *
 */
export async function getDefaultAPI(): Promise<AxiosResponse> {
	// Create a clean axios instance without interceptors for health checks
	const cleanAxios = axios.create({
		timeout: 10000, // 10 second timeout for health checks
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		}
	});

	try {
		// Primary: Use local Next.js health endpoint
		const response = await cleanAxios.get('/api/health');

		// Detect if this is Next.js API response (has nested data structure)
		const isNextJsResponse = response.data?.data && response.data?.response !== undefined;

		// Enhance response data with clear source identification
		const enhancedData = {
			...response.data,
			message: isNextJsResponse
				? `Next.js API → ${response.data.data?.message || 'Gauzy API'}`
				: response.data?.message || 'Next.js API Health Check',
			source: 'next-js',
			endpoint: '/api/health'
		};

		return {
			...response,
			data: enhancedData
		};
	} catch (error) {
		console.error('Local API Health Check Error:', error);

		// Fallback: Try direct Gauzy API health endpoint
		try {
			const fallbackResponse = await cleanAxios.get(`${GAUZY_API_BASE_SERVER_URL.value}/api/health`);

			// Transform Gauzy API response to match expected format with clear source indication
			const transformedData = {
				data: {
					status: fallbackResponse.data.status === 'ok' ? 200 : 500,
					message: fallbackResponse.data.status === 'ok' ? 'Direct Gauzy API' : 'Gauzy API Error'
				},
				response: fallbackResponse.data,
				message: `Direct Gauzy API → ${fallbackResponse.data.status === 'ok' ? 'Healthy' : 'Error'}`,
				source: 'gauzy-direct',
				endpoint: `${GAUZY_API_BASE_SERVER_URL.value}/api/health`,
				fallbackReason: 'Next.js API failed'
			};

			// Return transformed response maintaining axios structure
			return {
				...fallbackResponse,
				data: transformedData
			};
		} catch (fallbackError) {
			console.error('Fallback API Health Check Error:', fallbackError);
			throw error; // Throw original error for proper error handling
		}
	}
}
