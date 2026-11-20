/**
 * The code an administrator pastes into a site whose people sign in with their own account to track time there: the
 * `<ever-teams-timer>` element with "Sign in with Ever Teams", as the README of @ever-teams/embed describes it (#5577).
 */
import { withoutTrailingSlashes } from './public-api-origin';

/** Where the code expects the files of the `dist/` folder of @ever-teams/embed, on the site itself. */
export const EMBED_SCRIPT_PATH = '/ever-teams/ever-teams-embed.js';

export interface EmbedTimerCodeOptions {
	/** The API's address, ending with `/api`. */
	apiUrl: string;
	/** The organization the site signs people in to. */
	organizationId: string;
	/** The web app the sign-in window opens. */
	appUrl: string;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' };

function escapeAttribute(value: string): string {
	return value.replace(/[&"<>]/g, (character) => HTML_ESCAPES[character]);
}

/** The API's address the element calls: the API's public origin with `/api`. */
export function embedApiUrlOf(apiOrigin: string): string {
	return `${withoutTrailingSlashes(apiOrigin)}/api`;
}

/** The script line and the element, one attribute per line. */
export function embedTimerCodeOf(options: EmbedTimerCodeOptions): string {
	const attributes: [string, string][] = [
		['api-url', options.apiUrl],
		['sign-in', 'ever-teams'],
		['organization', options.organizationId],
		['app-url', options.appUrl]
	];
	const written = attributes.map(([name, value]) => `\t${name}="${escapeAttribute(value)}"`);
	return [
		`<script type="module" src="${EMBED_SCRIPT_PATH}"></script>`,
		'<ever-teams-timer',
		...written,
		'></ever-teams-timer>'
	].join('\n');
}
