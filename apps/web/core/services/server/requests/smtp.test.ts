/**
 * The tenant SMTP request copies the operator's SMTP account into a new tenant: it runs for every anonymous
 * sign-up (app/api/auth/register), every new social login account and every Ever ID provisioning, so the
 * operator's SMTP password must reach the Gauzy API and nothing else, the server log included.
 */
import { captureConsole } from '@/test/server-logs';
import { createTenantSmtpRequest } from './smtp';

const mockServerFetch = jest.fn();

jest.mock('../fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

jest.mock('@/core/constants/config/constants', () => ({
	smtpConfiguration: () => ({
		fromAddress: 'noreply@example.org',
		host: 'smtp.example.org',
		port: 587,
		secure: false,
		username: 'operator-smtp-user',
		password: 'operator-smtp-password'
	})
}));

afterEach(() => {
	jest.restoreAllMocks();
});

describe('createTenantSmtpRequest', () => {
	it("sends the operator's SMTP account to the Gauzy API for the new tenant", async () => {
		mockServerFetch.mockResolvedValue({ data: { id: 'smtp-1' } });

		await createTenantSmtpRequest({ tenantId: 'tenant-1', access_token: 'access-token' });

		expect(mockServerFetch).toHaveBeenCalledWith({
			path: '/smtp',
			method: 'POST',
			body: expect.objectContaining({ username: 'operator-smtp-user', password: 'operator-smtp-password' }),
			bearer_token: 'access-token',
			tenantId: 'tenant-1'
		});
	});

	it('writes neither the SMTP password nor the user name to the server log', async () => {
		const logs = captureConsole();
		mockServerFetch.mockResolvedValue({ data: { id: 'smtp-1' } });

		await createTenantSmtpRequest({ tenantId: 'tenant-1', access_token: 'access-token' });

		expect(logs.text()).not.toContain('operator-smtp-password');
		expect(logs.text()).not.toContain('operator-smtp-user');
	});
});
