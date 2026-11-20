import { expect, test } from '../../live-fixtures';

/**
 * What only a real API can answer.
 *
 * The mock answers every Gauzy path with 200 and a synthetic body, so the app's behaviour when an API
 * genuinely refuses is unprovable there. Against apidev.ever.team it is: a wrong password is a 401 the
 * page must show instead of signing in anyway, a sign-in code request is accepted and moves the page
 * to its code step, and a password reset for an address nobody owns is answered exactly like one for
 * an address that does — which is how the API refuses to confirm who has an account.
 *
 * The address used is in the reserved `.test` domain (RFC 2606), so it belongs to nobody and no mail
 * can be delivered to it; the API's answer is what is under test, not any mailbox.
 */
const UNUSED_ADDRESS = 'playwright-nobody@ever-teams.test';

test.describe('real API refusals', () => {
	test('a wrong password is refused by the API, and the page says so instead of signing in', async ({
		demo,
		shield
	}) => {
		const view = await demo('/auth/password');

		await view.locator('#passcode-email').fill(UNUSED_ADDRESS);
		await view.locator('#pw-password').fill('definitely-not-a-password');
		await view.getByRole('button', { name: 'Sign in' }).click();

		await expect(view.getByRole('alert')).toContainText('Incorrect email address or password', { timeout: 30_000 });
		await expect(view, 'the refusal is shown on the sign-in page; the person is not pushed anywhere').toHaveURL(
			/\/auth\/password/
		);

		const signins = shield.apiCalls().filter((call) => /signin/i.test(call.path));
		expect(
			signins.some((call) => call.status >= 400),
			`the refusal must come from the API, and the page made: ${JSON.stringify(signins)}`
		).toBe(true);
	});

	test('asking for a sign-in code is accepted, and the page moves to its code step', async ({ demo, shield }) => {
		const view = await demo('/auth/passcode');

		await view.locator('#passcode-email').fill(UNUSED_ADDRESS);
		await view.getByRole('button', { name: 'Send me a code' }).click();

		await expect(view.locator('#passcode-code'), 'the code step is where a person waits for the code').toBeVisible({
			timeout: 30_000
		});

		const sent = shield.apiCalls().filter((call) => /signin/i.test(call.path));
		expect(
			sent.some((call) => call.status >= 200 && call.status < 300),
			`the code request must reach the API, and the page made: ${JSON.stringify(sent)}`
		).toBe(true);
	});

	test('a reset asked for an address nobody owns is answered like one somebody owns', async ({ demo, shield }) => {
		const view = await demo('/auth/forgot-password');

		await view.locator('#forgot-email').fill(UNUSED_ADDRESS);
		await view.getByRole('button', { name: 'Send reset link' }).click();

		await expect(view.getByText('Password reset instructions have been sent to your email address')).toBeVisible({
			timeout: 30_000
		});
		// Confirming the address is missing would itself be the leak.
		await expect(
			view.getByRole('alert'),
			'the answer must not reveal whether the address has an account'
		).toHaveCount(0);

		const asked = shield.apiCalls().filter((call) => /password/i.test(call.path));
		expect(
			asked.some((call) => call.status >= 200 && call.status < 300),
			`the reset request must reach the API, and the page made: ${JSON.stringify(asked)}`
		).toBe(true);
	});
});
