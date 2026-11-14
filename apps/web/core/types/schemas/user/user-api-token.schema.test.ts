import {
	createdUserApiTokenSchema,
	createUserApiTokenInputSchema,
	USER_API_TOKEN_NAME_MAX_LENGTH,
	userApiTokenConfigSchema,
	userApiTokenListSchema
} from './user-api-token.schema';

/** A token as Gauzy's `GET /user-api-tokens` lists it (`UserApiTokenResponseDTO`). */
const listed = {
	id: 'token-1',
	userId: 'user-1',
	tenantId: 'tenant-1',
	name: 'Friday report',
	prefix: 'gzy_abc',
	createdAt: '2026-11-14T09:00:00.000Z',
	expiresAt: '2027-02-12T09:00:00.000Z',
	lastUsedAt: null,
	revokedAt: null
};

describe('personal API token answers', () => {
	it('reads whether the server offers the tokens', () => {
		expect(userApiTokenConfigSchema.parse({ enabled: true })).toEqual({ enabled: true });
		expect(userApiTokenConfigSchema.safeParse({}).success).toBe(false);
	});

	it('keeps of a listed token what the page shows, and never its owner ids', () => {
		const page = userApiTokenListSchema.parse({ items: [listed], total: 1 });

		expect(page.items).toEqual([
			{
				id: 'token-1',
				name: 'Friday report',
				createdAt: '2026-11-14T09:00:00.000Z',
				expiresAt: '2027-02-12T09:00:00.000Z',
				lastUsedAt: null
			}
		]);
	});

	it('refuses a listed token without an id', () => {
		const withoutId = { ...listed, id: undefined };

		expect(userApiTokenListSchema.safeParse({ items: [withoutId], total: 1 }).success).toBe(false);
	});

	it('keeps the secret of a token just created', () => {
		const created = createdUserApiTokenSchema.parse({ ...listed, token: 'gzy_abc.secret' });

		expect(created.token).toBe('gzy_abc.secret');
		expect(created.name).toBe('Friday report');
	});

	it('refuses a created token that carries no secret', () => {
		expect(createdUserApiTokenSchema.safeParse(listed).success).toBe(false);
	});
});

describe('a new token, as the page sends it', () => {
	it('trims the name and keeps only the name and the expiry', () => {
		const input = createUserApiTokenInputSchema.parse({
			name: '  Friday report  ',
			expiry: '90d',
			tenantId: 'tenant-2'
		});

		expect(input).toEqual({ name: 'Friday report', expiry: '90d' });
	});

	it('refuses an empty name, a name over the limit and an unknown expiry', () => {
		const tooLong = 'x'.repeat(USER_API_TOKEN_NAME_MAX_LENGTH + 1);

		expect(createUserApiTokenInputSchema.safeParse({ name: '   ', expiry: '1y' }).success).toBe(false);
		expect(createUserApiTokenInputSchema.safeParse({ name: tooLong, expiry: '1y' }).success).toBe(false);
		expect(createUserApiTokenInputSchema.safeParse({ name: 'Script', expiry: '30d' }).success).toBe(false);
	});

	it('accepts a name of exactly the limit and each expiry Gauzy offers', () => {
		const atLimit = 'x'.repeat(USER_API_TOKEN_NAME_MAX_LENGTH);

		for (const expiry of ['90d', '1y', 'never']) {
			expect(createUserApiTokenInputSchema.safeParse({ name: atLimit, expiry }).success).toBe(true);
		}
	});
});
