// cspell:ignore Northwind
/**
 * The embeds answers of an API that can limit a credential to one client, and of an older one that cannot: both read
 * the same way, with no client limit when the older one says nothing.
 */
import { validateApiResponse } from '@/core/types/schemas/utils/validation';
import {
	createdEmbedCredentialSchema,
	embedConfigSchema,
	embedCredentialListSchema,
	embedSiteGrantListSchema
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
			clientLimits: false,
			addMembers: false
		});
	});

	it('keeps the client limits an API offers', () => {
		expect(validateApiResponse(embedConfigSchema, { enabled: true, clientLimits: true })).toEqual({
			enabled: true,
			clientLimits: true,
			addMembers: false
		});
		expect(validateApiResponse(embedConfigSchema, { enabled: false, clientLimits: true })).toEqual({
			enabled: false,
			clientLimits: true,
			addMembers: false
		});
	});

	it('keeps whether the API says a credential can add the people it signs in as members', () => {
		const addsMembers = { enabled: true, clientLimits: true, addMembers: true };
		const addsNobody = { ...addsMembers, addMembers: false };

		expect(validateApiResponse(embedConfigSchema, addsMembers)).toEqual(addsMembers);
		expect(validateApiResponse(embedConfigSchema, addsNobody)).toEqual(addsNobody);
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

	it('reads a credential of an older API, which does not say whether it adds members, as one that does not', () => {
		const credentials = validateApiResponse(embedCredentialListSchema, [
			CREDENTIAL,
			{ ...CREDENTIAL, id: 'credential-2', canAddMembers: null }
		]);

		expect(credentials.map((credential) => credential.canAddMembers)).toEqual([false, false]);
	});

	it('keeps whether each credential adds the people it signs in as members', () => {
		const credentials = validateApiResponse(embedCredentialListSchema, [
			{ ...CREDENTIAL, canAddMembers: true },
			{ ...CREDENTIAL, id: 'credential-2', canAddMembers: false }
		]);

		expect(credentials.map((credential) => credential.canAddMembers)).toEqual([true, false]);
	});

	it('keeps that a credential just created adds members, beside its secret', () => {
		const created = validateApiResponse(createdEmbedCredentialSchema, {
			...CREDENTIAL,
			canAddMembers: true,
			secret: 'gze_abcdefgh.secret'
		});

		expect(created.canAddMembers).toBe(true);
		expect(created.secret).toBe('gze_abcdefgh.secret');
	});
});

describe('embedSiteGrantListSchema', () => {
	const GRANT = {
		id: 'grant-1',
		origin: 'https://team.example.com',
		organizationId: 'organization-1',
		userId: 'user-1',
		employeeId: 'employee-1',
		renewedAt: '2026-11-20T09:00:00.000Z',
		expiresAt: '2026-12-20T09:00:00.000Z'
	};

	it('keeps of each site the person allowed only what the list shows', () => {
		const grants = validateApiResponse(embedSiteGrantListSchema, [GRANT]);

		expect(grants).toEqual([
			{ id: 'grant-1', origin: 'https://team.example.com', expiresAt: '2026-12-20T09:00:00.000Z' }
		]);
	});

	it('refuses a site without the id that ends it', () => {
		expect(() => validateApiResponse(embedSiteGrantListSchema, [{ ...GRANT, id: '' }])).toThrow();
	});
});
