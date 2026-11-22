/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://teams.example.org/settings/team/members"}
 */
/**
 * The page an invitation e-mail links to. In direct mode the browser sends the invitation to Gauzy itself and names
 * that page as `callbackUrl`; an invitation that names none gets a link to the accept page of Gauzy's own web app,
 * outside this app. In proxy mode this app's route names the page, so the browser sends the addresses only.
 */
// A deployment that sets no INVITE_CALLBACK_URL, whatever the environment the suite runs in: the constant is read once,
// when the module loads.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	INVITE_CALLBACK_URL: undefined
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { inviteService } from '.';

const ACCEPT_PAGE = 'https://teams.example.org/auth/accept-invite';
const INVITATION = { emails: ['ines.okafor@example.com'], teamId: 'team-1', organizationId: 'organization-1' };
const NO_INVITATIONS = { items: [], total: 0 };
const ONE_UPDATED = { generatedMaps: [], raw: [], affected: 1 };

/** Direct mode is on when the deployment publishes Gauzy's URL to the browser; proxy mode publishes none (''). */
function publishApiUrl(url: string) {
	jest.spyOn(GAUZY_API_BASE_SERVER_URL, 'value', 'get').mockReturnValue(url);
}

function answerRoleAndPost(postAnswer: unknown) {
	jest.spyOn(inviteService, 'get').mockResolvedValue({ data: { id: 'role-employee' } } as never);
	return jest.spyOn(inviteService, 'post').mockResolvedValue({ data: postAnswer } as never);
}

afterEach(() => {
	jest.restoreAllMocks();
});

describe('inviteService, the page invitation e-mails link to', () => {
	it("names this app's accept page for a first invitation in direct mode", async () => {
		publishApiUrl('https://api.example.org');
		const post = answerRoleAndPost(NO_INVITATIONS);

		await inviteService.inviteByEmails(INVITATION);

		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith(
			'/invite/emails',
			expect.objectContaining({
				emailIds: ['ines.okafor@example.com'],
				inviteType: 'TEAM',
				callbackUrl: ACCEPT_PAGE
			}),
			expect.anything()
		);
	});

	it('names the same page for a resend in direct mode', async () => {
		publishApiUrl('https://api.example.org');
		const post = answerRoleAndPost(ONE_UPDATED);

		await inviteService.resendTeamInvitations('invite-1');

		expect(post).toHaveBeenCalledWith(
			'/invite/resend',
			expect.objectContaining({ inviteId: 'invite-1', callbackUrl: ACCEPT_PAGE })
		);
	});

	it("leaves the page to this app's route in proxy mode", async () => {
		publishApiUrl('');
		const post = answerRoleAndPost(NO_INVITATIONS);

		await inviteService.inviteByEmails(INVITATION);

		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith('/invite/emails', INVITATION, expect.anything());
	});
});
