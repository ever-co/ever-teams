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

/**
 * `<ever-teams-timer>`: the kit's sign-in and basic timer, in the element's own shadow root. It reads the attributes
 * of `EverTeamsTimerAttributes`, and dispatches no events.
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
}
