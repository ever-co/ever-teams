import type { ColorScheme } from './tokens';

/**
 * Status, priority, size and label colors come from the API, mostly as pastels that vanish in a light tint. As on the
 * web (apps/web/core/components/tasks/task-data-color.ts and the chip utility of styles/globals.css), the hue is kept,
 * its lightness and chroma are pinned, and the chip mixes that hue in OKLab. React Native has neither `oklch()` nor
 * `color-mix()`, so the same arithmetic runs here.
 */

interface Rgb {
	r: number;
	g: number;
	b: number;
}

interface OkLab {
	l: number;
	a: number;
	b: number;
}

export interface DataColorChip {
	background: string;
	border: string;
	ink: string;
}

const PINNED_LIGHTNESS = 0.62;
const CHROMA_FACTOR = 3;
const MAX_CHROMA = 0.16;

const HEX_COLOR = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_COLOR = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)$/i;

function fromHex(hex: string): Rgb {
	let digits = hex.slice(1);
	if (digits.length === 3) {
		digits = digits
			.split('')
			.map((digit) => digit + digit)
			.join('');
	}
	return {
		r: Number.parseInt(digits.slice(0, 2), 16),
		g: Number.parseInt(digits.slice(2, 4), 16),
		b: Number.parseInt(digits.slice(4, 6), 16)
	};
}

function parseColor(color: string): Rgb | null {
	const trimmed = color.trim();
	if (HEX_COLOR.test(trimmed)) {
		return fromHex(trimmed);
	}
	const rgb = RGB_COLOR.exec(trimmed);
	if (!rgb) {
		return null;
	}
	const channels = { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
	const outOfRange = [channels.r, channels.g, channels.b].some((channel) => channel > 255);
	if (outOfRange) {
		return null;
	}
	return channels;
}

function toLinear(channel: number) {
	const value = channel / 255;
	if (value <= 0.04045) {
		return value / 12.92;
	}
	return ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number) {
	const clamped = Math.min(Math.max(value, 0), 1);
	if (clamped <= 0.0031308) {
		return Math.round(clamped * 12.92 * 255);
	}
	return Math.round((1.055 * clamped ** (1 / 2.4) - 0.055) * 255);
}

function toOkLab({ r, g, b }: Rgb): OkLab {
	const red = toLinear(r);
	const green = toLinear(g);
	const blue = toLinear(b);
	const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
	const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
	const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
	return {
		l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	};
}

function toRgb({ l, a, b }: OkLab): Rgb {
	const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return {
		r: fromLinear(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
		g: fromLinear(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
		b: fromLinear(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short)
	};
}

/** The web's `oklch(from color 0.62 min(c * 3, 0.16) h)`. */
function pinnedHueOf(color: Rgb): OkLab {
	const lab = toOkLab(color);
	const chroma = Math.min(Math.hypot(lab.a, lab.b) * CHROMA_FACTOR, MAX_CHROMA);
	const hue = Math.atan2(lab.b, lab.a);
	return { l: PINNED_LIGHTNESS, a: chroma * Math.cos(hue), b: chroma * Math.sin(hue) };
}

/** `color-mix(in oklab, hue share, other)` for an opaque other color. */
function mixWith(hue: OkLab, share: number, other: OkLab): OkLab {
	const rest = 1 - share;
	return { l: hue.l * share + other.l * rest, a: hue.a * share + other.a * rest, b: hue.b * share + other.b * rest };
}

function rgbText({ r, g, b }: Rgb) {
	return `rgb(${r}, ${g}, ${b})`;
}

/** `color-mix(in oklab, hue share, transparent)`: the hue itself at that opacity. */
function translucent(hue: OkLab, share: number) {
	const { r, g, b } = toRgb(hue);
	return `rgba(${r}, ${g}, ${b}, ${share})`;
}

const WHITE: OkLab = { l: 1, a: 0, b: 0 };
const BLACK: OkLab = { l: 0, a: 0, b: 0 };

/** The hue the web draws a data color with: a dot, an icon, a ring. Null for a missing or unreadable color. */
export function dataColorHueOf(color: string | null | undefined): string | null {
	if (!color) {
		return null;
	}
	const parsed = parseColor(color);
	if (!parsed) {
		return null;
	}
	return rgbText(toRgb(pinnedHueOf(parsed)));
}

/**
 * The web's chip for a data color: a light tint of the hue, a hairline of it and an ink of the same hue (its gradient
 * is drawn flat at its middle). Null for a missing or unreadable color, so the caller keeps its neutral look.
 */
export function dataColorChipOf(color: string | null | undefined, scheme: ColorScheme): DataColorChip | null {
	if (!color) {
		return null;
	}
	const parsed = parseColor(color);
	if (!parsed) {
		return null;
	}
	const hue = pinnedHueOf(parsed);
	if (scheme === 'dark') {
		return {
			background: translucent(hue, 0.2),
			border: translucent(hue, 0.36),
			ink: rgbText(toRgb(mixWith(hue, 0.62, WHITE)))
		};
	}
	return {
		background: rgbText(toRgb(mixWith(hue, 0.12, WHITE))),
		border: translucent(hue, 0.3),
		ink: rgbText(toRgb(mixWith(hue, 0.72, BLACK)))
	};
}
