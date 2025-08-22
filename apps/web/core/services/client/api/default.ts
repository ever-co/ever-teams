import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/**
 * Health check API function that intelligently chooses between local and remote endpoints
 *
 * Local (Next.js): /api/health → calls Gauzy API and returns formatted response
 * Remote (Gauzy): /api/health → returns direct health status
 *
 * This avoids the problematic /api endpoint that was causing 503 cascading failures
 */
export async function getDefaultAPI() {
	try {
		// Use native fetch to avoid axios interceptor issues mentioned in the conversation
		const response = await fetch('/api/health', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Return axios-like response object for compatibility with existing code
		return {
			status: response.status,
			statusText: response.statusText,
			data: data,
			config: {
				url: response.url,
				method: 'GET'
			}
		};
	} catch (error) {
		console.error('API Health Check Error:', error);

		// Fallback: try direct Gauzy API health endpoint if local fails
		try {
			const fallbackResponse = await fetch(`${GAUZY_API_BASE_SERVER_URL.value}/api/health`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				}
			});

			if (!fallbackResponse.ok) {
				throw new Error(`Fallback HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
			}

			const fallbackData = await fallbackResponse.json();

			// Transform Gauzy API response to match Next.js API format for consistency
			const transformedData = {
				data: {
					status: fallbackData.status === 'ok' ? 200 : 500,
					message: fallbackData.status === 'ok' ? 'Gauzy API' : 'Gauzy API Error'
				},
				response: fallbackData
			};

			return {
				status: fallbackResponse.status,
				statusText: fallbackResponse.statusText,
				data: transformedData,
				config: {
					url: fallbackResponse.url,
					method: 'GET'
				}
			};
		} catch (fallbackError) {
			console.error('Fallback API Health Check Error:', fallbackError);
			throw error; // Throw original error
		}
	}
}
