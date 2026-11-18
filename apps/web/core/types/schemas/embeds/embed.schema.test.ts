// cspell:ignore Northwind
/**
 * The embeds answers of an API that can limit a credential to one client, and of an older one that cannot: both read
 * the same way, with no client limit when the older one says nothing.
 */
import { validateApiResponse } from '@/core/types/schemas/utils/validation';
import {
	createdEmbedCredentialSchema,
	embedConfigSchema,
	embedCredentialListSchema
} from '@/core/types/schemas/embeds/embed.schema';

const CREDENTIAL = {
	id: 'credential-1',
	name: 'Northwind customer portal',
	prefix: 'gze_abcdefgh',
	createdByUserId: 'user-1',
	createdAt: '2026-11-17T10:00:00.000Z',
	lastUsedAt: null
};

describe('embedConfigSchema', () => {
	it('reads an older API, which does not say whether it can limit a credential to a client, as unable to', () => {
		expect(validateApiResponse(embedConfigSchema, { enabled: true })).toEqual({
			enabled: true,
			clientLimits: false
		});
	});

	it('keeps the client limits an API offers', () => {
		expect(validateApiResponse(embedConfigSchema, { enabled: true, clientLimits: true })).toEqual({
			enabled: true,
			clientLimits: true
		});
		expect(validateApiResponse(embedConfigSchema, { enabled: false, clientLimits: true })).toEqual({
			enabled: false,
			clientLimits: true
		});
	});
});

describe('embedCredentialSchema', () => {
	it('reads the credentials of an older API, which name no client', () => {
		const [credential] = validateApiResponse(embedCredentialListSchema, [CREDENTIAL]);

		expect(credential.name).toBe('Northwind customer portal');
		expect(credential.organizationContactId).toBeUndefined();
	});

	it('keeps the client a credential is limited to, and none for one that reaches the whole workspace', () => {
		const credentials = validateApiResponse(embedCredentialListSchema, [
			{ ...CREDENTIAL, organizationContactId: 'contact-1' },
			{ ...CREDENTIAL, id: 'credential-2', organizationContactId: null }
		]);

		expect(credentials.map((credential) => credential.organizationContactId)).toEqual(['contact-1', null]);
	});

	it('keeps the client of a credential just created, beside its secret', () => {
		const created = validateApiResponse(createdEmbedCredentialSchema, {
			...CREDENTIAL,
			organizationContactId: 'contact-1',
			secret: 'gze_abcdefgh.secret'
		});

		expect(created.organizationContactId).toBe('contact-1');
		expect(created.secret).toBe('gze_abcdefgh.secret');
	});
});
