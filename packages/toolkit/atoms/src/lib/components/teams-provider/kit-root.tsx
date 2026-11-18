'use client';

import { createContext, ReactNode, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { PortalContainerContext } from '@ever-teams/toolkit-ui';
import {
	getKitPreferences,
	getServerKitPreferences,
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

// The class that turns on the kit's dark: variants and dark tokens inside its root.
function schemeClassName(scheme: 'light' | 'dark'): string | undefined {
	if (scheme === 'dark') {
		return 'dark';
	}
	return undefined;
}

/**
 * The kit root of <TeamsProvider scopedStyles>: an element that takes no box of its own (display: contents) around the
 * kit's components, and a container in document.body for their dialogs, popovers, menus and selects. Both carry the
 * attribute the stylesheet is scoped under, the color scheme and the picked font, so none of them touches the page.
 */
export function KitRoot({ children }: { children?: ReactNode }) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
	const preferences = useSyncExternalStore(subscribeKitPreferences, getKitPreferences, getServerKitPreferences);
	const prefersDark = useSyncExternalStore(subscribeSystemScheme, systemPrefersDark, serverPrefersDark);
	const scheme = resolveColorScheme(preferences.colorScheme, prefersDark);

	useEffect(() => {
		const element = document.createElement('div');
		element.setAttribute(KIT_ROOT_ATTRIBUTE, '');
		element.setAttribute('data-ever-teams-portal', '');
		document.body.appendChild(element);
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
			{...{ [KIT_ROOT_ATTRIBUTE]: '', [KIT_COLOR_SCHEME_ATTRIBUTE]: scheme }}
			className={schemeClassName(scheme)}
			style={{ display: 'contents', fontFamily: preferences.font ?? KIT_DEFAULT_FONT }}
		>
			<PortalContainerContext.Provider value={portalContainer}>{children}</PortalContainerContext.Provider>
		</div>
	);
}
