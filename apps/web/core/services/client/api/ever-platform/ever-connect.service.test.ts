/**
 * `everConnectService.health` as the read leaves the client: a paired API without the Ever Platform module answers
 * 404, which the read turns into `null` (the connection parts stay hidden) and keeps out of the error log; any other
 * failure still fails the read and is logged.
 */
import { loggedStatuses, refusingClient } from '@/test/api/refusing-client';
import { everConnectService } from './ever-connect.service';

const SCOPE = { tenantId: 'tenant-1', organizationId: 'organization-1', userId: 'user-1', accessToken: 'token-1' };

describe('everConnectService.health', () => {
	const refusing = refusingClient(everConnectService);
	afterEach(() => {
		refusing.restore();
		jest.restoreAllMocks();
	});

	it('asks with the scope of its render, and asks the client to keep a 404 out of its error log', async () => {
		const get = jest
			.spyOn(everConnectService, 'get')
			.mockResolvedValue({ data: { connected: true }, status: 200 } as never);

		await expect(everConnectService.health({ scope: SCOPE })).resolves.toEqual({ connected: true });

		expect(get).toHaveBeenCalledWith(
			'/ever-connect/health',
			expect.objectContaining({
				tenantId: 'tenant-1',
				pinnedAuthorization: true,
				headers: { Authorization: 'Bearer token-1' },
				quietStatuses: [404]
			})
		);
	});

	it('answers null for a paired API without the module and logs nothing, and still fails and logs a 500', async () => {
		const errorLog = refusing.refuse(404);
		await expect(everConnectService.health({ scope: SCOPE })).resolves.toBeNull();
		expect(loggedStatuses(errorLog)).toEqual([]);

		refusing.refuse(500);
		await expect(everConnectService.health({ scope: SCOPE })).rejects.toBeTruthy();
		expect(loggedStatuses(errorLog)).toEqual([500]);
	});
});
