/**
 * The page invitation e-mails link to. A deployment may set `INVITE_CALLBACK_URL` to name it; otherwise it is this
 * app's accept page, on the origin the invitation is sent from.
 */
// No top-level import in this file: keep it a module so its consts stay file-scoped.
export {};

const ORIGINAL_INVITE_CALLBACK_URL = process.env.INVITE_CALLBACK_URL;

function loadWithConfiguredUrl(value: string | undefined): typeof import('./invite-callback-url') {
	if (value === undefined) {
		delete process.env.INVITE_CALLBACK_URL;
	} else {
		process.env.INVITE_CALLBACK_URL = value;
	}
	let helper!: typeof import('./invite-callback-url');
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		helper = require('./invite-callback-url');
	});
	return helper;
}

afterEach(() => {
	if (ORIGINAL_INVITE_CALLBACK_URL === undefined) {
		delete process.env.INVITE_CALLBACK_URL;
	} else {
		process.env.INVITE_CALLBACK_URL = ORIGINAL_INVITE_CALLBACK_URL;
	}
});

describe('inviteCallbackUrl', () => {
	it.each([
		['unset', undefined],
		['empty', '']
	])("links this app's accept page when INVITE_CALLBACK_URL is %s", (_state, value) => {
		const { inviteCallbackUrl } = loadWithConfiguredUrl(value);

		expect(inviteCallbackUrl('https://teams.example.org')).toBe('https://teams.example.org/auth/accept-invite');
	});

	it('links the page INVITE_CALLBACK_URL names, whatever the origin', () => {
		const { inviteCallbackUrl } = loadWithConfiguredUrl('https://join.example.org/auth/accept-invite');

		expect(inviteCallbackUrl('https://teams.example.org')).toBe('https://join.example.org/auth/accept-invite');
	});
});
