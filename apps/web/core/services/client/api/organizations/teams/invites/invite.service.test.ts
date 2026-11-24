/**
 * The invitation check the accept page makes (`POST /invite/validate-by-code`), in both API modes. The Invite dialog
 * sends no full name, so Gauzy keeps the invitation with `fullName` null and answers it as such; the page asks the
 * person for their name. A check that refused that answer showed every invitee "This invitation is no longer valid".
 */
import { inviteService } from '.';

const CHECKED_INVITATION = {
	id: 'invite-1',
	email: 'sara@example.com',
	organization: { name: 'Studio North', image: null }
};

describe('inviteService.validateInvitationByCodeAndEmail', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('accepts an invitation sent without a name, as Gauzy answers it', async () => {
		const answer = { ...CHECKED_INVITATION, fullName: null };
		const post = jest.spyOn(inviteService, 'post').mockResolvedValue({ data: answer } as never);

		const invitation = await inviteService.validateInvitationByCodeAndEmail({
			email: 'sara@example.com',
			code: '123456'
		});

		expect(post).toHaveBeenCalledWith('/invite/validate-by-code', { email: 'sara@example.com', code: '123456' });
		expect(invitation).toEqual(answer);
	});

	it('accepts an answer that leaves the name out', async () => {
		jest.spyOn(inviteService, 'post').mockResolvedValue({ data: CHECKED_INVITATION } as never);

		const invitation = await inviteService.validateInvitationByCodeAndEmail({
			email: 'sara@example.com',
			code: '123456'
		});

		expect(invitation.fullName).toBeUndefined();
	});

	it('keeps the name of an invitation that carries one', async () => {
		const answer = { ...CHECKED_INVITATION, fullName: 'Sara Lind' };
		jest.spyOn(inviteService, 'post').mockResolvedValue({ data: answer } as never);

		const invitation = await inviteService.validateInvitationByCodeAndEmail({
			email: 'sara@example.com',
			code: '123456'
		});

		expect(invitation.fullName).toBe('Sara Lind');
	});

	it('still refuses an answer that is no invitation', async () => {
		const logger = (inviteService as unknown as { logger: { error: () => void } }).logger;
		jest.spyOn(logger, 'error').mockImplementation(() => undefined);
		jest.spyOn(inviteService, 'post').mockResolvedValue({ data: { statusCode: 400 } } as never);

		await expect(
			inviteService.validateInvitationByCodeAndEmail({ email: 'sara@example.com', code: '123456' })
		).rejects.toThrow();
	});
});
