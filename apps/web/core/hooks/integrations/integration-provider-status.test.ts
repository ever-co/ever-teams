import { integrationProviderStatus, isNotFoundError, type IntegrationProviderStatusInput } from './integration-provider-status';

const answered: IntegrationProviderStatusInput = {
	enabled: true,
	organizationId: 'org',
	isPending: false,
	isError: false,
	error: null,
	configured: true,
	connected: false
};

describe('integrationProviderStatus', () => {
	it('is hidden when the deployment switched the provider off, whatever the read says', () => {
		expect(integrationProviderStatus({ ...answered, enabled: false, isPending: true })).toBe('hidden');
		expect(integrationProviderStatus({ ...answered, enabled: false, connected: true })).toBe('hidden');
	});

	it('is loading until the organization and the read are known', () => {
		expect(integrationProviderStatus({ ...answered, organizationId: null })).toBe('loading');
		expect(integrationProviderStatus({ ...answered, isPending: true })).toBe('loading');
	});

	it('is hidden when the platform does not offer the provider (404), a load error otherwise', () => {
		expect(integrationProviderStatus({ ...answered, isError: true, error: { response: { status: 404 } } })).toBe('hidden');
		expect(integrationProviderStatus({ ...answered, isError: true, error: { response: { status: 500 } } })).toBe('loadError');
		expect(integrationProviderStatus({ ...answered, isError: true, error: new Error('offline') })).toBe('loadError');
	});

	it('is connected with a connection, then set up or not', () => {
		expect(integrationProviderStatus({ ...answered, connected: true })).toBe('connected');
		expect(integrationProviderStatus({ ...answered, connected: true, configured: false })).toBe('connected');
		expect(integrationProviderStatus(answered)).toBe('notConnected');
		expect(integrationProviderStatus({ ...answered, configured: false })).toBe('notConfigured');
	});
});

describe('isNotFoundError', () => {
	it('reads a 404 from a raw HTTP error, and nothing else as one', () => {
		expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
		expect(isNotFoundError({ response: { status: 403 } })).toBe(false);
		expect(isNotFoundError(null)).toBe(false);
		expect(isNotFoundError(undefined)).toBe(false);
	});
});
