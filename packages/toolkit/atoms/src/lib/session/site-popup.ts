import type { EmbedSiteTokens } from '@ever-teams/api';

// Sign-in with Ever Teams: the person allows the site in a popup on the Ever Teams web app (/embed/authorize), which
// posts the tokens to this page and closes. The kit takes a message only from the web app's origin and from that popup.

// What the web app's page posts to its opener.
export const AUTHORIZED_MESSAGE = 'ever-teams:embed-authorized';
export const DENIED_MESSAGE = 'ever-teams:embed-denied';

// One name for the popup: a second click brings the open one forward instead of a second window.
const POPUP_NAME = 'ever-teams-sign-in';
const POPUP_FEATURES = 'popup,width=480,height=680';
// How often the kit looks whether the person closed the popup.
export const POPUP_CLOSED_POLL_MS = 500;

export interface KitSiteSignIn {
	// The Ever Teams web app's address: https://app.ever.team, or your own.
	appUrl: string;
	// The organization the site belongs to, as Settings > Embeds of the web app shows it.
	organizationId: string;
}

export type SitePopupResult =
	| { kind: 'authorized'; tokens: EmbedSiteTokens }
	| { kind: 'denied' }
	| { kind: 'closed' }
	| { kind: 'blocked' };

export interface SitePopup {
	// The popup window, or null when the browser blocked it.
	window: Window | null;
	// What the popup ends with.
	result: Promise<SitePopupResult>;
	// Stops listening to the popup, for a provider that leaves the page: the result then ends as closed.
	stop: () => void;
}

const nothingToStop = () => undefined;

// A loop: the regex /\/+$/ backtracks on a long run of slashes.
function withoutTrailingSlashes(url: string): string {
	let end = url.length;
	while (end > 0 && url[end - 1] === '/') {
		end -= 1;
	}
	return url.slice(0, end);
}

/** The web app's page the popup opens, for this site and organization. */
export function authorizeUrlOf(signIn: KitSiteSignIn, siteOrigin: string): string {
	const query = new URLSearchParams({ origin: siteOrigin, organization: signIn.organizationId });
	return `${withoutTrailingSlashes(signIn.appUrl)}/embed/authorize?${query.toString()}`;
}

/** The origin the web app's messages come from, or null for an appUrl that is not an http or https address. */
export function appOriginOf(appUrl: string): string | null {
	try {
		const url = new URL(appUrl);
		const isWeb = url.protocol === 'https:' || url.protocol === 'http:';
		if (!isWeb) {
			return null;
		}
		return url.origin;
	} catch {
		return null;
	}
}

const isFilled = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function tokensOf(data: Record<string, unknown>): EmbedSiteTokens | null {
	const { token, expiresAt, renewalToken, renewalExpiresAt } = data;
	const hasTimerToken = isFilled(token) && isFilled(expiresAt);
	const hasRenewalToken = isFilled(renewalToken) && isFilled(renewalExpiresAt);
	if (!hasTimerToken || !hasRenewalToken) {
		return null;
	}
	return { token, expiresAt, renewalToken, renewalExpiresAt };
}

/** What a message of the web app says, or null for any other message. */
export function resultOfMessage(data: unknown): SitePopupResult | null {
	if (typeof data !== 'object' || data === null) {
		return null;
	}
	const message = data as Record<string, unknown>;
	if (message.type === DENIED_MESSAGE) {
		return { kind: 'denied' };
	}
	if (message.type !== AUTHORIZED_MESSAGE) {
		return null;
	}
	const tokens = tokensOf(message);
	if (!tokens) {
		return null;
	}
	return { kind: 'authorized', tokens };
}

/**
 * Opens the web app's sign-in popup: call it from the click that asks for it, or the browser blocks the popup. The
 * result is the tokens the web app posted, the person's refusal, or the popup closed without either.
 */
export function openSitePopup(signIn: KitSiteSignIn, host: Window = window): SitePopup {
	const appOrigin = appOriginOf(signIn.appUrl);
	if (!appOrigin) {
		return { window: null, result: Promise.resolve({ kind: 'blocked' }), stop: nothingToStop };
	}
	const popup = host.open(authorizeUrlOf(signIn, host.location.origin), POPUP_NAME, POPUP_FEATURES);
	if (!popup) {
		return { window: null, result: Promise.resolve({ kind: 'blocked' }), stop: nothingToStop };
	}
	let stop = nothingToStop;
	const result = new Promise<SitePopupResult>((resolve) => {
		let closedOnce = false;
		const finish = (ended: SitePopupResult) => {
			host.removeEventListener('message', onMessage);
			clearInterval(watch);
			resolve(ended);
		};
		const onMessage = (event: MessageEvent) => {
			if (event.origin !== appOrigin) {
				return;
			}
			if (event.source !== popup) {
				return;
			}
			const ended = resultOfMessage(event.data);
			if (ended) {
				finish(ended);
			}
		};
		// The popup closes itself right after its message: it counts as closed only at the next look, once the message
		// it posted had the time to arrive.
		const watch = setInterval(() => {
			if (!popup.closed) {
				return;
			}
			if (closedOnce) {
				finish({ kind: 'closed' });
				return;
			}
			closedOnce = true;
		}, POPUP_CLOSED_POLL_MS);
		host.addEventListener('message', onMessage);
		stop = () => finish({ kind: 'closed' });
	});
	return { window: popup, result, stop: () => stop() };
}
