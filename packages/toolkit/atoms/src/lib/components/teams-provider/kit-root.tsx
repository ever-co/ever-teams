'use client';

import { createContext, ReactNode, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PortalContainerContext } from '@ever-teams/toolkit-ui';
import {
	getKitPreferences,
	getServerKitPreferences,
	KitColorScheme,
	resolveColorScheme,
	subscribeKitPreferences
} from '@lib/stores/kit-preferences';

// The attribute every rule of @ever-teams/atoms/styles.css is scoped under.
export const KIT_ROOT_ATTRIBUTE = 'data-ever-teams-kit';
export const KIT_COLOR_SCHEME_ATTRIBUTE = 'data-ever-teams-color-scheme';

export interface KitOptions {
	// Whether the kit renders its own root (<TeamsProvider scopedStyles>) instead of relying on the host's page.
	scoped: boolean;
	// Called after a sign-out from the kit, instead of sending the browser to '/'.
	onSignOut?: () => void;
}

const KitOptionsContext = createContext<KitOptions>({ scoped: false });

export const useKitOptions = (): KitOptions => useContext(KitOptionsContext);

export const KitOptionsProvider = KitOptionsContext.Provider;

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemScheme(listener: () => void): () => void {
	const query = window.matchMedia?.(DARK_QUERY);
	query?.addEventListener('change', listener);
	return () => query?.removeEventListener('change', listener);
}

const systemPrefersDark = () => Boolean(window.matchMedia?.(DARK_QUERY).matches);
const serverPrefersDark = () => false;

// Gives the kit root and its portal container the color scheme and the picked font, and nothing else of the page.
function applyToKitElement(element: HTMLElement, scheme: 'light' | 'dark', font: string | null) {
	element.setAttribute(KIT_COLOR_SCHEME_ATTRIBUTE, scheme);
	element.classList.toggle('dark', scheme === 'dark');
	element.style.fontFamily = font ?? '';
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
export function KitRoot({ children, colorScheme }: { children?: ReactNode; colorScheme?: KitColorScheme }) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const preferences = useSyncExternalStore(subscribeKitPreferences, getKitPreferences, getServerKitPreferences);
	const prefersDark = useSyncExternalStore(subscribeSystemScheme, systemPrefersDark, serverPrefersDark);
	// The scheme a person picked with the theme toggle wins; otherwise this root's own provider's, so that two providers
	// of a page keep theirs.
	const ownScheme = colorScheme ?? preferences.colorScheme;
	const scheme = resolveColorScheme(preferences.chosenColorScheme ?? ownScheme, prefersDark);

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
			style={{ display: 'contents', fontFamily: preferences.font ?? undefined }}
		>
			<PortalContainerContext.Provider value={portalContainer}>{children}</PortalContainerContext.Provider>
		</div>
	);
}
