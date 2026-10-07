/**
 * @jest-environment jsdom
 */
/**
 * Regression guard for the browser-parity job: React #418 on every Cypress test (PR #4489).
 *
 * React 19 finds <title> and <link rel="icon"> anywhere in the document (hoistables), but an inline
 * <script> in <head> is a POSITIONALLY hydrated host element. Cypress's proxy rewrites the served
 * HTML to `<head> <script …>runner</script>`, and that leading space is a text node: React's
 * canHydrateInstance() walks element siblings only, hits the text node first, gives up and throws
 * "Hydration failed because the server rendered HTML didn't match the client" — which Cypress
 * reports as an uncaught application error, failing every test on the page.
 *
 * So <head> must keep NO positionally hydrated child. The runtime env travels on <html> instead,
 * where nothing injected into <head> can move it.
 */
import React, { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
// react-dom/server resolves to its browser build under @jest-environment jsdom, and that build wants
// MessageChannel/TextEncoder, which jsdom does not provide. The Node build renders the same markup.
import { renderToString } from 'react-dom/server.node';
import { RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute } from '@/env-config';

// This file drives React directly (no Testing Library), so it opts into act() itself.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const ENV = { NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://127.0.0.1:3988', APP_NAME: 'Acme Teams' };

/** Exactly what Cypress's proxy does to the response body, leading space included. */
function cypressInject(html: string): string {
	return html.replace(/<head(?!er).*?>/i, (tag) => `${tag} <script type='text/javascript'>window.__cy = 1;</script>`);
}

function Shell({ headScript }: Readonly<{ headScript: boolean }>) {
	return (
		<html lang="en" suppressHydrationWarning {...{ [RUNTIME_ENV_ATTRIBUTE]: serializeRuntimeEnvAttribute(ENV) }}>
			<head>
				{headScript ? (
					<script id="probe" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: 'void 0;' }} />
				) : null}
				<link rel="icon" href="/favicon.ico" />
				<title>Home</title>
			</head>
			<body>
				<div id="root">shell</div>
			</body>
		</html>
	);
}

let hydrated: ReturnType<typeof hydrateRoot> | undefined;

async function hydrateServedDocument(headScript: boolean): Promise<Error[]> {
	// Each case serves a fresh document into the same jsdom window, so drop the previous root first.
	if (hydrated) await act(async () => hydrated?.unmount());
	document.open();
	document.write(`<!DOCTYPE html>${cypressInject(renderToString(<Shell headScript={headScript} />))}`);
	document.close();

	const errors: Error[] = [];
	await act(async () => {
		hydrated = hydrateRoot(document, <Shell headScript={headScript} />, {
			onRecoverableError: (error) => errors.push(error as Error)
		});
	});

	return errors;
}

afterAll(async () => {
	await act(async () => hydrated?.unmount());
});

describe('<head> under a proxy that injects into it (Cypress browser-parity)', () => {
	it('hydrates with no error, because <head> carries only hoistables', async () => {
		expect(await hydrateServedDocument(false)).toEqual([]);
	});

	it('still publishes the runtime env, on <html> where the injection cannot reach it', async () => {
		await hydrateServedDocument(false);

		expect(JSON.parse(document.documentElement.getAttribute(RUNTIME_ENV_ATTRIBUTE) ?? '{}')).toEqual(ENV);
	});

	// Negative control: proves this test exercises the mechanism, and pins WHY the payload may never
	// go back into <head>. Delete it only together with the rule it protects.
	it('fails hydration as soon as <head> gets a single inline <script>', async () => {
		const errors = await hydrateServedDocument(true);

		expect(errors.map((error) => error.message).join('\n')).toMatch(/Hydration failed/);
	});
});
