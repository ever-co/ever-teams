/**
 * @jest-environment node
 */
import { createWorkspaceBodySchema, inviteAddressesOf, renameWorkspaceBodySchema } from './workspace';

describe('the invitations typed when a workspace is created (#5025)', () => {
	it('reads the addresses one per line or separated by commas, semicolons or spaces, once each', () => {
		expect(inviteAddressesOf(' Grace@Ever.co,alan@ever.co;\nada@ever.co  grace@ever.co ')).toEqual({
			valid: ['grace@ever.co', 'alan@ever.co', 'ada@ever.co'],
			invalid: []
		});
	});

	it('names what is not an address', () => {
		expect(inviteAddressesOf('grace@ever.co, grace, @ever.co')).toEqual({
			valid: ['grace@ever.co'],
			invalid: ['grace', '@ever.co']
		});
		expect(inviteAddressesOf('   ')).toEqual({ valid: [], invalid: [] });
	});
});

describe('the body of POST /api/auth/create-workspace', () => {
	it('trims the names, and keeps each invitation once, in lower case', () => {
		expect(
			createWorkspaceBodySchema.parse({ name: ' Studio ', teamName: ' Design ', invites: ['A@b.co', 'a@b.co'] })
		).toEqual({ name: 'Studio', teamName: 'Design', invites: ['a@b.co'] });
		expect(createWorkspaceBodySchema.parse({ name: 'Studio' })).toEqual({ name: 'Studio', invites: [] });
	});

	it('refuses a blank or too long name, and an address that is not one', () => {
		expect(createWorkspaceBodySchema.safeParse({ name: '  ' }).success).toBe(false);
		expect(createWorkspaceBodySchema.safeParse({ name: 'x'.repeat(61) }).success).toBe(false);
		expect(createWorkspaceBodySchema.safeParse({ name: 'Studio', invites: ['nope'] }).success).toBe(false);
	});
});

describe('the body of PUT /api/tenant (#5087)', () => {
	it('keeps the trimmed name and nothing else the request carries', () => {
		const body = { name: ' Studio ', logo: 'https://example.com/logo.png', tenantId: 'another-tenant' };

		expect(renameWorkspaceBodySchema.parse(body)).toEqual({ name: 'Studio' });
	});

	it('refuses a missing, blank or too long name', () => {
		expect(renameWorkspaceBodySchema.safeParse({}).success).toBe(false);
		expect(renameWorkspaceBodySchema.safeParse({ name: '  ' }).success).toBe(false);
		expect(renameWorkspaceBodySchema.safeParse({ name: 'x'.repeat(61) }).success).toBe(false);
		expect(renameWorkspaceBodySchema.safeParse({ name: 'x'.repeat(60) }).success).toBe(true);
	});
});
