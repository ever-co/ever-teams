import { clientError } from '../client/error-mapping';

// A page has a window with a document. Node, Bun, Deno (whose 1.x has a window) and the edge runtimes have no document.
function runsInPage(): boolean {
	const hasWindow = typeof window !== 'undefined';
	const hasDocument = typeof document !== 'undefined';
	return hasWindow && hasDocument;
}

/** Throws in a page, where the credential the server helpers send would be readable by anyone who opens it. */
export function assertServerOnly(): void {
	if (runsInPage()) {
		throw clientError(
			'SERVER_ONLY',
			'@ever-teams/api/server runs on a server only, and this code runs in a page.',
			'Call exchangeEmbedToken and getClientReport from your server (a route handler or an API route), keep the ' +
				'credential there, and give the page only the token or the report they answer.'
		);
	}
}
