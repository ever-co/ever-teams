// The package's types, written by hand: the element's source would bring React's types in. The build writes this
// file next to dist/ever-teams-embed.js, where TypeScript looks for the types of the package's entry.

/** The values of `color-scheme`: `system` follows the system's scheme. */
export type EverTeamsColorScheme = 'light' | 'dark' | 'system';

/** The attributes `<ever-teams-timer>` reads. A change of attribute applies at once. */
export interface EverTeamsTimerAttributes {
	/** The Ever Teams API the timer talks to, ending in `/api`. Default: `https://api.ever.team/api`. */
	'api-url'?: string;
	/** `light`, `dark`, or `system` (the default, follows the system's). */
	'color-scheme'?: EverTeamsColorScheme;
	/** The language of the timer and its sign-in: `en` (the default) or `fr`. */
	lang?: string;
	/**
	 * `ever-teams`: a "Sign in with Ever Teams" button opens the Ever Teams web app in a popup, where the person allows
	 * this site; no password or token is typed in the page. An administrator turns it on for the site in Settings >
	 * Embeds. Without it, the kit's own sign-in.
	 */
	'sign-in'?: EverTeamsSignIn;
	/** The organization the site signs people in to, with `sign-in="ever-teams"`. */
	organization?: string;
	/** The Ever Teams web app the popup opens, with `sign-in="ever-teams"`. Default: `https://app.ever.team`. */
	'app-url'?: string;
}

/** The values of `sign-in`: `ever-teams`, the sign-in with Ever Teams in a popup. */
export type EverTeamsSignIn = 'ever-teams';

type CamelCase<Name extends string> = Name extends `${infer Head}-${infer Tail}`
	? `${Head}${Capitalize<CamelCase<Tail>>}`
	: Name;

/**
 * The same attributes in camelCase (`colorScheme` for `color-scheme`): Vue's template checker takes the element for a
 * component and gives its attributes these names.
 */
export type EverTeamsTimerProps = {
	[Name in keyof EverTeamsTimerAttributes as CamelCase<Name>]: EverTeamsTimerAttributes[Name];
};

/** The name the package defines the element under. */
export declare const TIMER_ELEMENT_NAME: 'ever-teams-timer';

/** The `detail` of `ever-teams-timer-change`: the person's timer as a read of its status shows it. */
export interface EverTeamsTimerChange {
	/** Whether the timer runs. A running break reads as `false`, as the API answers it. */
	running: boolean;
	/** When the running entry started (an ISO date); `null` while the timer is stopped. */
	startedAt: string | null;
	/** The running entry's project; `null` while the timer is stopped or runs on no project. */
	projectId: string | null;
	/** The running entry's task; `null` while the timer is stopped or runs on no task. */
	taskId: string | null;
	/** `true` for the first read, which tells the timer as it is; `false` for each change after it. */
	initial: boolean;
}

/** The name of the event the element dispatches at its first read of the person's timer and at each change after it. */
export declare const TIMER_CHANGE_EVENT: 'ever-teams-timer-change';

/**
 * `<ever-teams-timer>`: the kit's sign-in and basic timer, in the element's own shadow root. It reads the attributes
 * of `EverTeamsTimerAttributes`, and dispatches `ever-teams-timer-change` with an `EverTeamsTimerChange`.
 */
export declare class EverTeamsTimerElement extends HTMLElement {
	static readonly observedAttributes: string[];
	connectedCallback(): void;
	disconnectedCallback(): void;
	attributeChangedCallback(): void;
	/**
	 * Ends the person's sign-in with Ever Teams (`sign-in="ever-teams"`) as the user menu does: forgotten in the
	 * browser, ended at the API, and the "Sign in with Ever Teams" button shows again. Call it on each timer of the
	 * page when your page signs its own user out, so the next person on a shared computer does not get the previous
	 * one's timer: each timer holds its own token. An element no longer in the page ends the sign-in saved for its
	 * `api-url` and `organization`. Without `sign-in="ever-teams"`, it does nothing.
	 */
	signOut(): Promise<void>;
}

declare global {
	interface HTMLElementTagNameMap {
		'ever-teams-timer': EverTeamsTimerElement;
	}
	// The event bubbles and crosses shadow roots: a page listens on the element, on `document` or on `window`.
	interface GlobalEventHandlersEventMap {
		'ever-teams-timer-change': CustomEvent<EverTeamsTimerChange>;
	}
}
