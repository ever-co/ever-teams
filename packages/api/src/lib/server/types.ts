// The options take `undefined` and `null` as they come from process.env or a user record: the helpers refuse a
// missing one with the code CLIENT_OPTIONS before any request.
interface EmbedServerOptions {
	/** The API's address, ending with /api: `https://api.example.com/api`. */
	apiUrl: string | undefined;
	/**
	 * The embed credential (`gze_...`) an administrator of the organization created in Settings > Embeds of the web
	 * app. It stays on your server: read it from an environment variable, never from the page.
	 */
	credential: string | undefined;
	/** The fetch to send the request with; the platform's by default. */
	fetch?: typeof fetch;
}

export interface ExchangeEmbedTokenOptions extends EmbedServerOptions {
	/** The person to sign in, by the email of their Ever Teams account. Give it or `employeeId`, not both. */
	email?: string | null;
	/** The person to sign in, by their employee id in the credential's organization. */
	employeeId?: string | null;
	/**
	 * The origin of the page the timer runs in (`https://app.example.com`), one of the sites the organization allows:
	 * the token works only from it.
	 */
	origin: string | undefined;
	/** The first name of the account an API creates for `email` when the credential may add members. */
	firstName?: string | null;
	/** The last name of the account an API creates for `email` when the credential may add members. */
	lastName?: string | null;
}

export interface EverTeamsEmbedToken {
	/** An access token that reaches only the person's timer, from the page's origin. */
	token: string;
	/** When it expires, as an ISO date. */
	expiresAt: string;
}

export type GetClientReportOptions = EmbedServerOptions;
