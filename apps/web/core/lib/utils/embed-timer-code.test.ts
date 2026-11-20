import { EMBED_SCRIPT_PATH, embedApiUrlOf, embedTimerCodeOf } from './embed-timer-code';

/**
 * The code Settings > Embeds gives for a site whose people sign in with their own account: the element needs the
 * organization, which the app showed nowhere (#5577), the API's address and the web app's.
 */
describe('embedTimerCodeOf', () => {
	it('gives the script and the element with the API, the organization and the web app', () => {
		const code = embedTimerCodeOf({
			apiUrl: 'https://api.example.com/api',
			organizationId: '00000000-0000-4000-8000-000000000002',
			appUrl: 'https://teams.example.com'
		});

		expect(code).toBe(
			[
				`<script type="module" src="${EMBED_SCRIPT_PATH}"></script>`,
				'<ever-teams-timer',
				'\tapi-url="https://api.example.com/api"',
				'\tsign-in="ever-teams"',
				'\torganization="00000000-0000-4000-8000-000000000002"',
				'\tapp-url="https://teams.example.com"',
				'></ever-teams-timer>'
			].join('\n')
		);
	});

	it('escapes what could close an attribute', () => {
		const code = embedTimerCodeOf({
			apiUrl: 'https://a.example.com/api?x="1"&y=<2>',
			organizationId: 'o',
			appUrl: 'a'
		});

		expect(code).toContain('api-url="https://a.example.com/api?x=&quot;1&quot;&amp;y=&lt;2&gt;"');
	});
});

describe('embedApiUrlOf', () => {
	it("adds /api to the API's origin, without doubling a slash", () => {
		expect(embedApiUrlOf('https://api.example.com')).toBe('https://api.example.com/api');
		expect(embedApiUrlOf('https://api.example.com/')).toBe('https://api.example.com/api');
	});
});
