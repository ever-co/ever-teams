import type { FontVariant, TextStyle } from 'react-native';

/**
 * The web app's design tokens (apps/web/styles/globals.css), as HSL triplets under the same names, in light and
 * dark. `tokens.test.ts` parses globals.css and fails when a value here drifts from the web.
 */
export type ColorToken =
	| 'background'
	| 'foreground'
	| 'muted'
	| 'muted-foreground'
	| 'popover'
	| 'popover-foreground'
	| 'card'
	| 'card-foreground'
	| 'border'
	| 'input'
	| 'primary'
	| 'primary-foreground'
	| 'secondary'
	| 'secondary-foreground'
	| 'accent'
	| 'accent-foreground'
	| 'destructive'
	| 'destructive-foreground'
	| 'ring'
	| 'sidebar-background'
	| 'primary-ink'
	| 'destructive-ink'
	| 'success'
	| 'success-foreground'
	| 'warning'
	| 'warning-foreground'
	| 'info'
	| 'info-foreground';

export type ColorScheme = 'light' | 'dark';

/** `h s% l%`, the web's notation, so a value can be compared with globals.css as text. */
export type HslTriplet = string;

export const webColorTokens: Record<ColorScheme, Record<ColorToken, HslTriplet>> = {
	light: {
		background: '240 11% 98%',
		foreground: '240 6% 10%',
		muted: '240 5% 95%',
		'muted-foreground': '240 4% 42%',
		popover: '0 0% 100%',
		'popover-foreground': '240 6% 10%',
		card: '0 0% 100%',
		'card-foreground': '240 6% 10%',
		border: '240 3% 89%',
		input: '240 3% 89%',
		primary: '239 84% 67%',
		'primary-foreground': '0 0% 100%',
		secondary: '240 5% 95%',
		'secondary-foreground': '240 6% 10%',
		accent: '240 5% 95%',
		'accent-foreground': '240 6% 10%',
		destructive: '0 84% 60%',
		'destructive-foreground': '0 0% 100%',
		ring: '239 84% 67%',
		'sidebar-background': '240 3% 94%',
		'primary-ink': '243 75% 59%',
		'destructive-ink': '0 74% 42%',
		success: '161 100% 37%',
		'success-foreground': '163 100% 24%',
		warning: '38 100% 49%',
		'warning-foreground': '26 100% 36%',
		info: '200 98% 39%',
		'info-foreground': '201 96% 32%'
	},
	dark: {
		background: '240 5% 7%',
		foreground: '240 5% 90%',
		muted: '240 4% 13%',
		'muted-foreground': '240 5% 62%',
		popover: '240 5% 11%',
		'popover-foreground': '240 5% 90%',
		card: '240 5% 10%',
		'card-foreground': '240 5% 90%',
		border: '240 4% 16%',
		input: '240 4% 18%',
		primary: '239 84% 67%',
		'primary-foreground': '0 0% 100%',
		secondary: '240 4% 13%',
		'secondary-foreground': '240 5% 90%',
		accent: '240 4% 13%',
		'accent-foreground': '0 0% 100%',
		destructive: '0 72% 51%',
		'destructive-foreground': '0 0% 100%',
		ring: '0 0% 40%',
		'sidebar-background': '240 6% 4%',
		'primary-ink': '234 89% 74%',
		'destructive-ink': '0 91% 71%',
		success: '161 100% 37%',
		'success-foreground': '158 76% 64%',
		warning: '38 100% 49%',
		'warning-foreground': '47 100% 61%',
		info: '198 93% 60%',
		'info-foreground': '199 95% 74%'
	}
};

/** `hsl(h, s%, l%)` and `hsla(…)` strings, which React Native accepts as colors. */
export function hsl(triplet: HslTriplet, alpha = 1): string {
	const [hue, saturation, lightness] = triplet.split(' ');
	if (alpha >= 1) {
		return `hsl(${hue}, ${saturation}, ${lightness})`;
	}
	return `hsla(${hue}, ${saturation}, ${lightness}, ${alpha})`;
}

/**
 * The foreground alpha scale of the design system, for states drawn as a tint of the text color (hover becomes the
 * press state on a phone): subtle backgrounds, hairlines, separators.
 */
export const foregroundAlpha = { 2: 0.02, 2.5: 0.025, 5: 0.05, 10: 0.1, 15: 0.15, 25: 0.25 } as const;

/** control 8, inner panel 10, sheet and popover 14, dialog 18 (the web's --radius 0.625rem scale). */
export const radius = { control: 8, panel: 10, sheet: 14, dialog: 18, full: 999 } as const;

export const spacing = { 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

/** A mutable array: React Native types fontVariant as FontVariant[], which a readonly tuple does not satisfy. */
const TABULAR_DIGITS: FontVariant[] = ['tabular-nums'];

/** Weights capped at semibold; durations use tabular digits. */
export const typeScale = {
	title: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
	heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
	body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
	label: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
	hint: { fontSize: 13, lineHeight: 17, fontWeight: '400' },
	micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
	timer: { fontSize: 44, lineHeight: 52, fontWeight: '600', fontVariant: TABULAR_DIGITS },
	stat: { fontSize: 22, lineHeight: 28, fontWeight: '600', fontVariant: TABULAR_DIGITS }
} satisfies Record<string, TextStyle>;

/** Motion of the design system: exits 120-150 ms, state changes 200-240 ms, one easing curve, no bounce. */
export const motion = {
	exit: 140,
	state: 220,
	easing: [0.22, 1, 0.36, 1] as const
} as const;

/** Smallest touch target, in dp (Android 48, iOS 44). */
export const minimumTouchTarget = 48;
