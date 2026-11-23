import { inviteAcceptRefusalKey } from './invite-accept-refusal';

describe('inviteAcceptRefusalKey', () => {
	it('tells a person whose address already has an account to sign in first', () => {
		expect(inviteAcceptRefusalKey(409)).toBe('loginScreen.errors.existingAccountSignInFirst');
	});

	it.each([[400], [401], [429], [500], [undefined]])('keeps the usual message for status %p', (status) => {
		expect(inviteAcceptRefusalKey(status)).toBe('loginScreen.errors.invalidCode');
	});
});
