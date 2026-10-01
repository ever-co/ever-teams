import { ISigninEmailConfirmWorkspaces } from './auth';

/**
 * Payloads of the Gauzy API's Ever ID routes (`/api/auth/zitadel/*`), as Ever Teams uses them.
 *
 * The API hands out opaque one-time keys ("hand-off" keys) for every step that continues on another page;
 * nothing personal ever travels in a URL, only such a key.
 */

/** A workspace of an Ever ID sign-in: Gauzy's usual workspace entry (the token signs in once chosen). */
export interface IEverIdWorkspace {
	token: string;
	user: {
		id: string;
		email: string | null;
		name: string | null;
		imageUrl: string | null;
		lastTeamId?: string | null;
		lastLoginAt?: string | null;
		tenant: { id: string; name: string; logo: string } | null;
	};
	/** Not sent by the Ever ID routes today; kept optional so a later API that adds it is used as is. */
	current_teams?: ISigninEmailConfirmWorkspaces['current_teams'];
}

/** A workspace linked to the identity that this sign-in may not enter (for example one requiring its company sign-in). */
export interface IEverIdBlockedWorkspace {
	tenantId: string | null;
	tenantName: string;
	reason: string;
}

/** The workspace list an Ever ID sign-in, a confirmed link or a confirmed sign-up answers with. */
export interface IEverIdWorkspacesResponse {
	workspaces: IEverIdWorkspace[];
	confirmed_email: string;
	show_popup: boolean;
	total_workspaces: number;
	blocked_workspaces?: IEverIdBlockedWorkspace[];
	redirect?: string;
}

/** `POST /api/auth/zitadel/token` (200): the workspaces, or a link that needs Gauzy's one-time e-mail code first. */
export type IEverIdTokenResponse = IEverIdWorkspacesResponse | { confirm_required: true; handoff: string };

/** `POST /api/auth/zitadel/token` (404 bodies the route distinguishes). */
export type IEverIdTokenNotFound = { code: 'no_workspace' } | { code: 'signup_required'; handoff: string };

/** `POST /api/auth/zitadel/signup/details`: what the sign-up confirmation shows (the key stays valid). */
export interface IEverIdSignupDetails {
	email: string;
	firstName?: string;
	lastName?: string;
	status?: 'subscription_required';
	checkoutUrl?: string;
}

/** A legal document Gauzy requires a new account to accept (`GET /api/terms/required`). */
export interface IEverIdTermsDocument {
	documentId: string;
	version: string;
	sha256: string;
	locale: string;
	title?: string;
	url?: string;
	effectiveDate?: string;
}

/** The acceptance of one document, sent back with the sign-up (Gauzy checks it against what it publishes). */
export type IEverIdTermsClaim = Pick<IEverIdTermsDocument, 'documentId' | 'version' | 'sha256' | 'locale'>;

/** What the sign-up page reads for an Ever ID hand-off (`POST /api/auth/ever-id/signup-handoff`). */
export interface IEverIdSignupPrefill {
	name: string;
	email: string;
	terms: IEverIdTermsDocument[];
	/** Set when the confirmed sign-up waits for a subscription: continue at checkout. */
	checkoutUrl?: string;
}

/** The register body of an Ever ID sign-up: the usual fields plus the hand-off key and the confirmation. */
export interface IEverIdRegisterDataAPI {
	name: string;
	email: string;
	team: string;
	timezone?: string;
	recaptcha?: string;
	ever_id_handoff: string;
	confirm: boolean;
	terms?: IEverIdTermsClaim[];
}

/** What the Ever ID sign-in leaves in the next-auth session for the workspace chooser (no Gauzy token yet). */
export interface IEverIdSessionData {
	provider: 'ever-id';
	workspaces: IEverIdWorkspace[];
	confirmed_mail: string;
	/** The workspace to start the chooser on, when the ID token points at exactly one of them. */
	preselectTenantId?: string;
}
