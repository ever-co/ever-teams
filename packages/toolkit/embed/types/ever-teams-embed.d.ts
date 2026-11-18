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
}

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
