import createCache, { type EmotionCache } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
	endSiteSignIn,
	TeamsBasicTimer,
	TeamsLoginDialog,
	TeamsProvider,
	useSiteSignIn,
	type SiteSignInControls,
	type TimerChange
} from '@ever-teams/atoms';
import kitStylesheet from '@ever-teams/atoms/styles.css?inline';
import { registerKitProperties, splitKitStyles } from './kit-styles';

export const TIMER_ELEMENT_NAME = 'ever-teams-timer';

// The event the element dispatches at each change of the person's timer, with the TimerChange as its detail.
export const TIMER_CHANGE_EVENT = 'ever-teams-timer-change';

// :host stops what the page's rules pass down by inheritance (letter spacing, line height, colors...), except the
// font, which the widgets take from the page as the React kit does.
const HOST_STYLES = ':host{all:initial;display:block;font-family:inherit}:host([hidden]){display:none}';

const kitStyles = splitKitStyles(kitStylesheet);

type ColorScheme = 'light' | 'dark' | 'system';

function colorSchemeOf(value: string | null): ColorScheme {
	if (value === 'light') {
		return value;
	}
	if (value === 'dark') {
		return value;
	}
	return 'system';
}

// The API client's own default address. The client merges each new setting into the last one, and all the timers of a
// page share it: an element that never had api-url leaves it as it is, one whose api-url was removed names the default.
const KIT_DEFAULT_API_URL = 'https://api.ever.team/api';

function configOf(apiUrl: string | null, hadApiUrl: boolean) {
	if (apiUrl) {
		return { apiUrl };
	}
	if (hadApiUrl) {
		return { apiUrl: KIT_DEFAULT_API_URL };
	}
	return {};
}

interface SiteSignInConfig {
	signIn?: 'ever-teams';
	organizationId?: string;
	appUrl?: string;
}

// sign-in="ever-teams": the "Sign in with Ever Teams" popup, for the organization and on the web app the attributes
// name. Any other value, or none, keeps the kit's own sign-in: the provider gets nothing new.
function signInConfigOf(element: HTMLElement): SiteSignInConfig {
	if (element.getAttribute('sign-in') !== 'ever-teams') {
		return {};
	}
	const config: SiteSignInConfig = {
		signIn: 'ever-teams',
		organizationId: element.getAttribute('organization') ?? ''
	};
	const appUrl = element.getAttribute('app-url');
	if (appUrl) {
		config.appUrl = appUrl;
	}
	return config;
}

// The sign-in controls of a render, with the API address and organization that render named.
interface KeptSiteSignIn {
	controls: SiteSignInControls;
	scope: string;
}

type KeepSiteSignIn = (kept: KeptSiteSignIn | null) => void;

// Hands the provider's sign-in with Ever Teams to the element, for its signOut().
function SiteSignInBridge({ keep, scope }: { keep: KeepSiteSignIn; scope: string }) {
	const controls = useSiteSignIn();
	useEffect(() => {
		if (controls) {
			keep({ controls, scope });
		} else {
			keep(null);
		}
		return () => keep(null);
	}, [controls, keep, scope]);
	return null;
}

/**
 * <ever-teams-timer api-url="https://api.ever.team/api">: the kit's sign-in and basic timer, rendered by React in the
 * element's own shadow root with the kit's stylesheet. Attributes: api-url, color-scheme (light, dark, system), lang,
 * and sign-in="ever-teams" with organization and app-url for the sign-in with Ever Teams. Removing the element stops
 * its timer display and its requests. It dispatches ever-teams-timer-change (bubbles, composed) at the first read of
 * the timer and at each start, stop or other running entry a later read shows. signOut() ends a sign-in with Ever
 * Teams from the page.
 */
export class EverTeamsTimerElement extends HTMLElement {
	static readonly observedAttributes = ['api-url', 'color-scheme', 'lang', 'sign-in', 'organization', 'app-url'];

	private root: Root | null = null;
	private cache: EmotionCache | null = null;
	private hadApiUrl = false;
	private siteSignIn: KeptSiteSignIn | null = null;

	private readonly keepSiteSignIn: KeepSiteSignIn = (kept) => {
		this.siteSignIn = kept;
	};

	// One function for every render: the provider keeps it.
	private readonly dispatchTimerChange = (change: TimerChange) => {
		const event = new CustomEvent<TimerChange>(TIMER_CHANGE_EVENT, {
			detail: change,
			bubbles: true,
			composed: true
		});
		this.dispatchEvent(event);
	};

	connectedCallback() {
		// Moved in the page (removed and inserted again in one task): the kit goes on as it was, with its shadow root.
		if (this.root) {
			this.render();
			return;
		}
		const page = this.ownerDocument;
		const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
		registerKitProperties(page, kitStyles.page);
		const style = page.createElement('style');
		style.textContent = HOST_STYLES + kitStyles.shadow;
		const mount = page.createElement('div');
		shadow.replaceChildren(style, mount);
		// theme-ui writes its styles through emotion, into the document head by default: here, into the shadow root.
		this.cache = createCache({ key: 'ever-teams', container: shadow });
		this.root = createRoot(mount);
		this.render();
	}

	disconnectedCallback() {
		// In a microtask: an element that is only moving is connected again by then, and a page's own React that removes
		// the element does it while it commits, when another root cannot be unmounted at once.
		queueMicrotask(() => {
			if (this.isConnected) {
				return;
			}
			this.root?.unmount();
			this.root = null;
			this.cache = null;
			this.shadowRoot?.replaceChildren();
		});
	}

	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Ends the person's sign-in with Ever Teams (sign-in="ever-teams") as the user menu does: forgotten here, ended at
	 * the API, and the button shows again. A page calls it when it signs its own user out, so the next person on a
	 * shared computer does not get the timer of the previous one (#5580). An element not in the page ends the sign-in
	 * saved for its api-url and organization.
	 */
	async signOut(): Promise<void> {
		if (this.getAttribute('sign-in') !== 'ever-teams') {
			return;
		}
		// Controls kept from a render for other attributes (changed in this task, not rendered yet) end another sign-in.
		const kept = this.siteSignIn;
		if (kept && kept.scope === this.siteScope()) {
			await kept.controls.signOut();
			return;
		}
		await endSiteSignIn({
			...configOf(this.getAttribute('api-url'), this.hadApiUrl),
			organizationId: this.getAttribute('organization') ?? ''
		});
	}

	// The API address and organization the attributes name now.
	private siteScope(): string {
		const config: { apiUrl?: string } = configOf(this.getAttribute('api-url'), this.hadApiUrl);
		return JSON.stringify([config.apiUrl ?? '', this.getAttribute('organization') ?? '']);
	}

	private render() {
		if (!this.root || !this.cache) {
			return;
		}
		const lang = this.getAttribute('lang') ?? undefined;
		const apiUrl = this.getAttribute('api-url');
		if (apiUrl) {
			this.hadApiUrl = true;
		}
		this.root.render(
			<CacheProvider value={this.cache}>
				<TeamsProvider
					config={{ ...configOf(apiUrl, this.hadApiUrl), ...signInConfigOf(this) }}
					scopedStyles
					colorScheme={colorSchemeOf(this.getAttribute('color-scheme'))}
					lang={lang}
					onTimerChange={this.dispatchTimerChange}
				>
					<SiteSignInBridge keep={this.keepSiteSignIn} scope={this.siteScope()} />
					<TeamsLoginDialog />
					<TeamsBasicTimer />
				</TeamsProvider>
			</CacheProvider>
		);
	}
}
