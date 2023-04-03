// TODO: write documentation for colors and palette in own markdown file and add links from here
import {
	MD2LightTheme as PaperDefaultTheme,
	MD3DarkTheme as PaperDarkTheme,
	useTheme,
} from "react-native-paper"
import {
	DarkTheme as NavigationDarkTheme,
	DefaultTheme as NavigationDefaulTheme,
} from "@react-navigation/native"

const palette = {
	neutral100: "#FFFFFF",
	neutral200: "#F4F2F1",
	neutral300: "#D7CEC9",
	neutral400: "#B6ACA6",
	neutral500: "#978F8A",
	neutral600: "#564E4A",
	neutral700: "#3C3836",
	neutral800: "#173A56",
	neutral900: "#000000",

	primary100: "#DCDDE9",
	primary200: "#BCC0D6",
	primary300: "#9196B9",
	primary400: "#626894",
	primary500: "#41476E",
	primary600: "#11008B",

	secondary100: "#F4E0D9",
	secondary200: "#E8C1B4",
	secondary300: "#DDA28E",
	secondary400: "#D28468",
	secondary500: "#C76542",
	secondary600: "#A54F31",

	accent100: "#FFEED4",
	accent200: "#FFE1B2",
	accent300: "#FDD495",
	accent400: "#FBC878",
	accent500: "#FFBB50",

	angry100: "#F2D6CD",
	angry500: "#C03403",

	overlay20: "rgba(25, 16, 21, 0.2)",
	overlay50: "rgba(25, 16, 21, 0.5)",
	background: "rgb(255,255,255)",
	primary: "#282048",
}

export const customDarkTheme = {
	...NavigationDarkTheme,
	...PaperDarkTheme,
	colors: {
		...NavigationDarkTheme.colors,
		...PaperDarkTheme.colors,
		primary: "#FFFFFF",
		secondary: "#8C7AE4",
		tertiary: "#7B8089",
		background: "#191A20",
		background2: "rgb(16,17,20)",
		divider: "rgba(255, 255, 255, 0.16)",
		border: "rgba(255, 255, 255, 0.13)",
	},
}

export const customLightTheme = {
	...NavigationDefaulTheme,
	...PaperDefaultTheme,
	colors: {
		...NavigationDefaulTheme.colors,
		...PaperDefaultTheme.colors,
		primary: "#282048",
		secondary: "#3826A6",
		tertiary: "#7E7991",
		background: "#FFFFFF",
		background2: "#F2F2F2",
		divider: "rgba(0, 0, 0, 0.06)",
		border: "rgba(0, 0, 0, 0.13)",
	},
}
export type AppTheme = typeof customDarkTheme

export const useAppTheme = () => useTheme<AppTheme>()

export const colors = {
	/**
	 * The palette is available to use, but prefer using the name.
	 * This is only included for rare, one-off cases. Try to use
	 * semantic names as much as possible.
	 */
	palette,
	/**
	 * A helper for making something see-thru.
	 */
	transparent: "rgba(0, 0, 0, 0)",
	/**
	 * The default text color in many components.
	 */
	text: palette.neutral800,
	/**
	 * Secondary text information.
	 */
	textDim: palette.neutral600,
	/**
	 * The default color of the screen background.
	 */
	primary: palette.primary,
	background: palette.background,
	/**
	 * The default border color.
	 */
	border: palette.neutral400,
	/**
	 * The main tinting color.
	 */
	tint: palette.primary500,
	/**
	 * A subtle color used for lines.
	 */
	separator: palette.neutral300,
	/**
	 * Error messages.
	 */
	error: palette.angry500,
	/**
	 * Error Background.
	 *
	 */
	errorBackground: palette.angry100,
}
