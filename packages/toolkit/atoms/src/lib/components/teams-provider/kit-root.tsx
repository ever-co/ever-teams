'use client';

import { ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
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

export { useKitOptions, KitOptionsProvider } from './kit-options';
export type { KitOptions } from './kit-options';

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
			style={{ display: 'contents', fontFamily: preferences.font ?? undefined }}
		>
			<PortalContainerContext.Provider value={portalContainer}>{children}</PortalContainerContext.Provider>
		</div>
	);
}
