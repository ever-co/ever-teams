/**
 * The personal API tokens of the signed-in person: Gauzy's `/user-api-tokens` routes in direct mode, and the app's
 * `/api/user-api-tokens` twins in proxy mode, on the same paths. Every answer is read through its schema.
 */
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

import { userApiTokensService } from './user-api-tokens.service';

function answer(data: unknown, status = 200) {
	return { config: {}, data, headers: {}, status, statusText: 'OK' } as never;
}

const LISTED = {
	id: 'token-1',
	userId: 'user-1',
	tenantId: 'tenant-1',
	name: 'Friday report',
	prefix: 'gzy_abc',
	createdAt: '2026-11-14T09:00:00.000Z',
	expiresAt: null,
	lastUsedAt: null,
	revokedAt: null
};

afterEach(() => {
	jest.restoreAllMocks();
});

describe('userApiTokensService', () => {
	it('keeps the HTTP settings of the client it extends', () => {
		// A method named like one of that client's own members (its `config`) would replace them, and with them the
		// address every direct-mode request is sent to.
		expect(userApiTokensService.getConfig()).toEqual(
			expect.objectContaining({ timeout: expect.any(Number), directAPI: expect.any(Boolean) })
		);
	});
});

describe('userApiTokensService.readConfig', () => {
	it('asks whether the server has the tokens on', async () => {
		const get = jest.spyOn(userApiTokensService, 'get').mockResolvedValue(answer({ enabled: false }));
		const signal = new AbortController().signal;

		await expect(userApiTokensService.readConfig(signal)).resolves.toEqual({ enabled: false });
		expect(get).toHaveBeenCalledWith('/user-api-tokens/config', { signal });
	});

	it('refuses an answer that does not say it', async () => {
		jest.spyOn(userApiTokensService, 'get').mockResolvedValue(answer({}));

		await expect(userApiTokensService.readConfig()).rejects.toThrow();
	});
});

describe('userApiTokensService.list', () => {
	it("reads the person's tokens, with what the page shows", async () => {
		const get = jest.spyOn(userApiTokensService, 'get').mockResolvedValue(answer({ items: [LISTED], total: 1 }));

		const tokens = await userApiTokensService.list();

		expect(get.mock.calls[0][0]).toBe('/user-api-tokens');
		expect(tokens).toEqual([
			{
				id: 'token-1',
				name: 'Friday report',
				createdAt: '2026-11-14T09:00:00.000Z',
				expiresAt: null,
				lastUsedAt: null
			}
		]);
	});
});

describe('userApiTokensService.create', () => {
	it('sends the name and the expiry alone, keeps the secret it answers out of the request log, and returns it', async () => {
		const post = jest
			.spyOn(userApiTokensService, 'post')
			.mockResolvedValue(answer({ ...LISTED, token: 'gzy_abc.secret' }, 201));

		const created = await userApiTokensService.create({ name: 'Friday report', expiry: '1y' });

		expect(post).toHaveBeenCalledWith(
			'/user-api-tokens',
			{ name: 'Friday report', expiry: '1y' },
			{ secretResponse: true },
			false
		);
		expect(created.token).toBe('gzy_abc.secret');
	});
});

describe('userApiTokensService.revoke', () => {
	it('revokes the token by its id', async () => {
		const remove = jest.spyOn(userApiTokensService, 'delete').mockResolvedValue(answer(undefined, 204));

		await userApiTokensService.revoke('token/1');

		expect(remove).toHaveBeenCalledWith('/user-api-tokens/token%2F1');
	});
});
