import { expect, test } from '../../fixtures';

/**
 * TEMPORARY probe (lane B): what the sign-in page actually puts on the wire from a lane port, and what the
 * mock answers. Deleted once the real specs are written.
 */
test('probe: the passcode form on the wire', async ({ anon, mock, shield }) => {
	const view = await anon('/auth/passcode');
	const seen: string[] = [];
	view.on('response', (response) => {
		if (response.url().includes('3996')) seen.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
	});

	await view.locator('#passcode-email').fill('manager@example.test');
	await view.getByRole('button', { name: 'Send me a code' }).click();
	await view.waitForTimeout(5_000);

	const requests = await mock.requests();
	const cookies = await view.context().cookies();
	const inputs = await view.evaluate(() =>
		Array.from(document.querySelectorAll('input'))
			.map((el) => `${el.id || '(no id)'} type=${el.type} name=${el.name ?? ''} maxLength=${el.maxLength}`)
	);
	const buttons = await view.evaluate(() =>
		Array.from(document.querySelectorAll('button')).map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
	);
	const dump = JSON.stringify(
		{
			url: view.url(),
			requests: requests.map((r) => `${r.method} ${r.path}${r.query ? `?${r.query}` : ''} ${r.status}`),
			browserResponsesToMock: seen,
			cookies: cookies.map((c) => `${c.name}=${c.value}`),
			inputs,
			buttons,
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		},
		null,
		1
	);
	expect(dump, 'PROBE LANE-B').toBe('<<<dump printed in the Received line above>>>');
});
