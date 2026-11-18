/** What a getToken resolves to: the token, or an object holding it (the answer of an exchange route). */
export type EverTeamsTokenAnswer = string | { token: string };

export interface EverTeamsClientOptions {
	/** The API's address, ending with /api: `https://api.example.com/api`. */
	apiUrl: string;
	/**
	 * A personal API token (`gzp_...`, from Settings > API tokens in the web app), which the client exchanges for a
	 * short-lived access token, or an access token such as an embed token.
	 */
	token?: string;
	/** Gives a token when the client has none, and once more after the API refused one (401). */
	getToken?: () => Promise<EverTeamsTokenAnswer>;
	/** The tenant to work in. Read once from the token's user when not given. */
	tenantId?: string;
	/** The organization to work in. Read once from the token's member when not given. */
	organizationId?: string;
	/** The fetch to send requests with; the platform's by default. */
	fetch?: typeof fetch;
	/** Headers added to every request. The client's own (Authorization, tenant and organization) take precedence. */
	headers?: Record<string, string>;
}
