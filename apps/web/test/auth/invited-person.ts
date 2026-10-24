/**
 * Test-only Gauzy answers for an invited person (never part of the app): the e-mailed code matches an invite,
 * accepting it signs them in, and they belong to one organization with one team. The tokens are distinctive so a
 * test can look for them anywhere, in the server log above all.
 */
import type { MockGauzyApi } from '@/test/ever-id/mock-gauzy-api';

export const INVITED = {
	email: 'invited@example.test',
	/** AUTH_CODE_LENGTH characters. */
	code: 'AB12CD34',
	userId: 'user-1',
	tenantId: 'tenant-1',
	organizationId: 'org-1',
	teamId: 'team-1',
	accessToken: 'access-token-7f3c1a9e-never-log-me',
	refreshToken: 'refresh-token-2b8d4e6f-never-log-me'
} as const;

/** Sets the stand-in's invite, accept, user-organization and team answers for the INVITED person. */
export function primeInvitedPerson(gauzy: MockGauzyApi): void {
	gauzy.on('POST', '/api/invite/validate-by-code', {
		status: 201,
		body: {
			id: 'invite-1',
			email: INVITED.email,
			fullName: 'Invited Person',
			organization: { name: 'Acme' },
			isExpired: false
		}
	});
	gauzy.on('POST', '/api/invite/accept', {
		status: 201,
		body: {
			user: { id: INVITED.userId, tenantId: INVITED.tenantId, email: INVITED.email },
			token: INVITED.accessToken,
			refresh_token: INVITED.refreshToken
		}
	});
	gauzy.on('GET', '/api/user-organization', {
		status: 200,
		body: {
			items: [
				{
					id: 'user-organization-1',
					userId: INVITED.userId,
					tenantId: INVITED.tenantId,
					organizationId: INVITED.organizationId
				}
			],
			total: 1
		}
	});
	gauzy.on('GET', '/api/organization-team', {
		status: 200,
		body: { items: [{ id: INVITED.teamId, name: 'Acme Team' }], total: 1 }
	});
}

/** The password the route generated for the invited person (it sends it to `/invite/accept`). */
export function generatedPassword(gauzy: MockGauzyApi): string {
	const [accept] = gauzy.calls('POST', '/api/invite/accept');
	return (accept?.body as { password?: string } | undefined)?.password ?? '';
}

/**
 * What must never reach the server log for an invited person's sign-in: both tokens and the generated password
 * (the e-mail address too: the log identifies people by id).
 */
export function expectNoInvitedSecretsIn(log: string, gauzy: MockGauzyApi): void {
	const password = generatedPassword(gauzy);
	expect(password).not.toBe('');
	expect(log).not.toContain(INVITED.accessToken);
	expect(log).not.toContain(INVITED.refreshToken);
	expect(log).not.toContain(password);
	expect(log).not.toContain(INVITED.email);
}
