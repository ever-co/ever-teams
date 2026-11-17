import { Theme } from 'theme-ui';

/**
 * By default theme-ui writes on the host page: border-box on every element, no margin on body, and the theme's colors
 * as custom properties plus a text and background color on <html>; it also stores a color mode in localStorage. The
 * kit turns all of that off. Without custom properties, theme-ui gives the widgets' sx styles the raw colors, which
 * otherwise would point to the custom properties defined on <html>.
 */
export function withoutGlobalStyles<T extends Theme>(theme: T): T {
	return {
		...theme,
		config: {
			...theme.config,
			useRootStyles: false,
			useBorderBox: false,
			useCustomProperties: false,
			useLocalStorage: false
		}
	};
}
