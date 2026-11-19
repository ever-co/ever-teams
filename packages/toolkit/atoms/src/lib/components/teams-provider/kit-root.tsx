'use client';

import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PortalContainerContext } from '@ever-teams/toolkit-ui';
import {
	getKitPreferences,
	getServerKitPreferences,
	KitColorScheme,
	resolveColorScheme,
	setKitPreferences,
	subscribeKitPreferences
} from '@lib/stores/kit-preferences';

// The attribute every rule of @ever-teams/atoms/styles.css is scoped under.
export const KIT_ROOT_ATTRIBUTE = 'data-ever-teams-kit';
export const KIT_COLOR_SCHEME_ATTRIBUTE = 'data-ever-teams-color-scheme';

export { useKitOptions, KitOptionsProvider } from './kit-options';
export type { KitOptions } from './kit-options';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemScheme(listener: () => void): () => void {
	const query = window.matchMedia?.(DARK_QUERY);
	query?.addEventListener('change', listener);
	return () => query?.removeEventListener('change', listener);
}

/**
 * The face of the widgets when nobody picked one: the Ever Teams web app's, the system UI font (nothing downloaded).
 * A host that wants its own sets --ever-teams-kit-font, on any parent of the widgets (on :root for their dialogs too).
 */
export const KIT_DEFAULT_FONT =
	"var(--ever-teams-kit-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji')";

const systemPrefersDark = () => Boolean(window.matchMedia?.(DARK_QUERY).matches);
const serverPrefersDark = () => false;

// Gives the kit root and its portal container the color scheme and the font, and nothing else of the page.
function applyToKitElement(element: HTMLElement, scheme: 'light' | 'dark', font: string | null) {
	element.setAttribute(KIT_COLOR_SCHEME_ATTRIBUTE, scheme);
	element.classList.toggle('dark', scheme === 'dark');
	element.style.fontFamily = font ?? KIT_DEFAULT_FONT;
}

// Node.DOCUMENT_FRAGMENT_NODE: the root of an element rendered in a shadow root.
const DOCUMENT_FRAGMENT_NODE = 11;

// Where the dialogs, popovers and menus open: in the shadow root that holds the kit root (the kit's stylesheet is
// adopted there, the page's does not reach in), in document.body otherwise.
function portalParentOf(element: HTMLElement | null): Node {
	const root = element?.getRootNode();
	if (root?.nodeType === DOCUMENT_FRAGMENT_NODE) {
		return root;
	}
	return document.body;
}

// The class that turns on the kit's dark: variants and dark tokens inside its root.
function schemeClassName(scheme: 'light' | 'dark'): string | undefined {
	if (scheme === 'dark') {
		return 'dark';
	}
	return undefined;
}

/**
 * The kit root of <TeamsProvider scopedStyles>: an element that takes no box of its own (display: contents) around the
 * kit's components, and a container for their dialogs, popovers, menus and selects, in document.body or in the shadow
 * root the kit root is rendered in. Both carry the attribute the stylesheet is scoped under, the color scheme and the
 * picked font, so none of them touches the page.
 */
export function KitRoot({ children, colorScheme }: Readonly<{ children?: ReactNode; colorScheme?: KitColorScheme }>) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const preferences = useSyncExternalStore(subscribeKitPreferences, getKitPreferences, getServerKitPreferences);
	const prefersDark = useSyncExternalStore(subscribeSystemScheme, systemPrefersDark, serverPrefersDark);
	// The scheme a person picked with the theme toggle wins; otherwise this root's own provider's, so that two providers
	// of a page keep theirs.
	const ownScheme = colorScheme ?? preferences.colorScheme;
	const scheme = resolveColorScheme(preferences.chosenColorScheme ?? ownScheme, prefersDark);
	const givenScheme = useRef(colorScheme);

	// A scheme the host changes afterwards applies at once, like any changed attribute: it drops the person's pick.
	useEffect(() => {
		if (givenScheme.current === colorScheme) {
			return;
		}
		givenScheme.current = colorScheme;
		if (getKitPreferences().chosenColorScheme) {
			setKitPreferences({ chosenColorScheme: null });
		}
	}, [colorScheme]);

	useEffect(() => {
		const element = document.createElement('div');
		element.setAttribute(KIT_ROOT_ATTRIBUTE, '');
		element.setAttribute('data-ever-teams-portal', '');
		portalParentOf(rootRef.current).appendChild(element);
		setPortalContainer(element);
		return () => {
			element.remove();
		};
	}, []);

	useEffect(() => {
		if (portalContainer) {
			applyToKitElement(portalContainer, scheme, preferences.font);
		}
	}, [portalContainer, scheme, preferences.font]);

	return (
		<div
			ref={rootRef}
			{...{ [KIT_ROOT_ATTRIBUTE]: '', [KIT_COLOR_SCHEME_ATTRIBUTE]: scheme }}
			className={schemeClassName(scheme)}
			style={{ display: 'contents', fontFamily: preferences.font ?? KIT_DEFAULT_FONT }}
		>
			<PortalContainerContext.Provider value={portalContainer}>{children}</PortalContainerContext.Provider>
		</div>
	);
}
