// The kit's display preferences, shared by the provider, the kit root and the toggles of a page: the font a person
// picked, whether Google Fonts may be loaded, and the color scheme. Nothing here touches the host page.

import { FONT_OPTIONS } from '../font/font';

export type KitColorScheme = 'light' | 'dark' | 'system';

export interface KitPreferences {
	// The font picked with the font toggle; null keeps the host's font.
	font: string | null;
	loadGoogleFonts: boolean;
	colorScheme: KitColorScheme;
}

export const FONT_STORAGE_KEY = 'ever-teams:selected-font';
// The key versions up to 0.2.14 used; read once, then moved to the prefixed key. Those versions stored their default
// font there on every load, so that value says nothing about a choice and is not carried over.
export const LEGACY_FONT_STORAGE_KEY = 'selected-font';
const LEGACY_DEFAULT_FONT = FONT_OPTIONS[0].value;

const listeners = new Set<() => void>();
let preferences: KitPreferences = { font: null, loadGoogleFonts: false, colorScheme: 'system' };
let fontRead = false;

function storage(): Storage | null {
	if (typeof window === 'undefined') {
		return null;
	}
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function readStoredFont(): string | null {
	const store = storage();
	if (!store) {
		return null;
	}
	const stored = store.getItem(FONT_STORAGE_KEY);
	if (stored) {
		return stored;
	}
	const legacy = store.getItem(LEGACY_FONT_STORAGE_KEY);
	if (!legacy || legacy === LEGACY_DEFAULT_FONT) {
		return null;
	}
	store.setItem(FONT_STORAGE_KEY, legacy);
	return legacy;
}

export function getKitPreferences(): KitPreferences {
	if (!fontRead && typeof window !== 'undefined') {
		fontRead = true;
		preferences = { ...preferences, font: readStoredFont() };
	}
	return preferences;
}

// For server rendering: no stored choice is visible there.
export function getServerKitPreferences(): KitPreferences {
	return { font: null, loadGoogleFonts: false, colorScheme: preferences.colorScheme };
}

export function subscribeKitPreferences(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function setKitPreferences(next: Partial<KitPreferences>): void {
	const current = getKitPreferences();
	preferences = { ...current, ...next };
	const fontChanged = 'font' in next && next.font !== current.font;
	if (fontChanged && next.font) {
		storage()?.setItem(FONT_STORAGE_KEY, next.font);
	}
	listeners.forEach((listener) => listener());
}

// For tests: back to the defaults, stored font read again.
export function resetKitPreferences(): void {
	preferences = { font: null, loadGoogleFonts: false, colorScheme: 'system' };
	fontRead = false;
	listeners.forEach((listener) => listener());
}

// The scheme to draw: the person's choice, or the system's when the choice is 'system'.
export function resolveColorScheme(scheme: KitColorScheme, systemPrefersDark: boolean): 'light' | 'dark' {
	if (scheme === 'dark') {
		return 'dark';
	}
	if (scheme === 'light') {
		return 'light';
	}
	if (systemPrefersDark) {
		return 'dark';
	}
	return 'light';
}
