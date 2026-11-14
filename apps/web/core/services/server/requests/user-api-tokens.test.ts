/**
 * Gauzy's personal API token routes, as the app's proxy routes call them.
 */
const mockServerFetch = jest.fn();

jest.mock('../fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

import { getUserApiTokenConfigRequest } from './user-api-tokens';

it('keeps the HTTP status of a refusal without a body, so an API without the routes reads as tokens off', () => {
	getUserApiTokenConfigRequest({ bearer_token: 'access-token', tenantId: 'tenant-1' });

	expect(mockServerFetch).toHaveBeenCalledWith(
		expect.objectContaining({
			path: '/user-api-tokens/config',
			method: 'GET',
			bearer_token: 'access-token',
			tenantId: 'tenant-1',
			keepsStatusOnError: true
		})
	);
});
