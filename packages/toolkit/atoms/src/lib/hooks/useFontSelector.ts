import { SetStateAction, useEffect, useSyncExternalStore } from 'react';
import { FONT_OPTIONS } from '../font/font';
import {
	getKitPreferences,
	getServerKitPreferences,
	setKitPreferences,
	subscribeKitPreferences
} from '@lib/stores/kit-preferences';
import { useKitOptions } from '@components/teams-provider/kit-root';
import { warnOnce } from '@lib/utils/warn-once';

/**
 * The font a person picked with the font toggle, shared by every caller of the page. It applies to the kit root
 * (<TeamsProvider scopedStyles>); until a font is picked the widgets use the host's font. Without scopedStyles there
 * is no kit root, so a picked font still goes on document.body as before, with a warning.
 * Google Fonts are requested only when the host allows it (<TeamsProvider loadGoogleFonts>).
 */
const useFontSelector = () => {
	const preferences = useSyncExternalStore(subscribeKitPreferences, getKitPreferences, getServerKitPreferences);
	const { scoped } = useKitOptions();
	const selectedFont = preferences.font ?? FONT_OPTIONS[0].value;

	const setSelectedFont = (next: SetStateAction<string>) => {
		let font = next as string;
		if (typeof next === 'function') {
			// The store's current font, not this render's: two updates in a row then build on each other.
			font = next(getKitPreferences().font ?? FONT_OPTIONS[0].value);
		}
		setKitPreferences({ font });
	};

	useEffect(() => {
		const pickedFont = preferences.font;
		if (!preferences.loadGoogleFonts || !pickedFont) {
			return;
		}
		const font = FONT_OPTIONS.find((option) => option.value === pickedFont);
		if (!font?.googleFont) {
			return;
		}
		const fontName = font.name.replace(' ', '+');
		const linkId = `google-font-${fontName}`;
		if (document.getElementById(linkId)) {
			return;
		}
		const link = document.createElement('link');
		link.id = linkId;
		link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
		link.rel = 'stylesheet';
		document.head.appendChild(link);
	}, [preferences.font, preferences.loadGoogleFonts]);

	useEffect(() => {
		const pickedFont = preferences.font;
		if (scoped || !pickedFont) {
			return;
		}
		document.body.style.fontFamily = pickedFont;
		warnOnce(
			'body-font',
			'without <TeamsProvider scopedStyles>, the font picked in TeamsFontToggle is set on document.body. With scopedStyles it applies to the widgets only.'
		);
	}, [scoped, preferences.font]);

	return {
		selectedFont,
		setSelectedFont,
		fontOptions: FONT_OPTIONS
	};
};

export default useFontSelector;
