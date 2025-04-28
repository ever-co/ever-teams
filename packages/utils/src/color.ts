/* -------------------------------------------------------------------------- */
/*                                Color Types                                 */
/* -------------------------------------------------------------------------- */

/**
 * Represents a color in RGB format.
 * - r: Red (0-255)
 * - g: Green (0-255)
 * - b: Blue (0-255)
 */
export interface RGBColor {
	r: number;
	g: number;
	b: number;
}

/**
 * Represents a color in HSL format.
 * - h: Hue (0-360)
 * - s: Saturation (0-100)
 * - l: Lightness (0-100)
 */
export interface HSLColor {
	h: number;
	s: number;
	l: number;
}

/* -------------------------------------------------------------------------- */
/*                          Color Validation Utilities                       */
/* -------------------------------------------------------------------------- */

/**
 * Clamp and floor a numeric color value to ensure it remains within RGB range.
 *
 * @param value - Input value to sanitize.
 * @returns Clamped and floored value between 0 and 255.
 *
 * @example
 * sanitizeColorComponent(270) => 255
 * sanitizeColorComponent(-10) => 0
 */
export const sanitizeColorComponent = (value: number): number => {
	if (value < 0) return 0;
	if (value > 255) return 255;
	return Math.floor(value);
};

/* -------------------------------------------------------------------------- */
/*                          RGB and HEX Conversion                           */
/* -------------------------------------------------------------------------- */

/**
 * Convert a decimal color value to a two-character hexadecimal string.
 *
 * @param value - Decimal color value (0-255).
 * @returns Hexadecimal string representation.
 *
 * @example
 * decimalToHex(15) => "0f"
 */
export const decimalToHex = (value: number): string => sanitizeColorComponent(value).toString(16).padStart(2, "0");

/**
 * Convert an RGB color to a hexadecimal color string.
 *
 * @param rgb - RGBColor object.
 * @returns Hexadecimal color string prefixed with '#'.
 *
 * @example
 * rgbToHex({ r: 255, g: 0, b: 0 }) => "#ff0000"
 */
export const rgbToHex = ({ r, g, b }: RGBColor): string => `#${decimalToHex(r)}${decimalToHex(g)}${decimalToHex(b)}`;

/**
 * Convert a hexadecimal color string to an RGBColor object.
 *
 * @param hex - Hexadecimal color string (with or without '#').
 * @returns RGBColor object.
 *
 * @example
 * hexToRgb("#ff0000") => { r: 255, g: 0, b: 0 }
 */
export const hexToRgb = (hex: string): RGBColor => {
	const normalizedHex = hex.trim().replace(/^#/, "");
	const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizedHex);

	return match
		? {
				r: parseInt(match[1], 16),
				g: parseInt(match[2], 16),
				b: parseInt(match[3], 16),
			}
		: { r: 0, g: 0, b: 0 };
};

/* -------------------------------------------------------------------------- */
/*                          HEX and HSL Conversion                           */
/* -------------------------------------------------------------------------- */

/**
 * Convert a hexadecimal color string to an HSLColor object.
 *
 * @param hex - Hexadecimal color string (e.g., "#ff0000").
 * @returns HSLColor object.
 *
 * @example
 * hexToHsl("#ff0000") => { h: 0, s: 100, l: 50 }
 */
export const hexToHsl = (hex: string): HSLColor => {
	if (!/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
		return { h: 0, s: 0, l: 0 };
	}

	const { r, g, b } = hexToRgb(hex);

	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const delta = max - min;

	let hue = 0;
	const lightness = (max + min) / 2;
	let saturation = 0;

	if (delta !== 0) {
		saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

		switch (max) {
			case rNorm:
				hue = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
				break;
			case gNorm:
				hue = (bNorm - rNorm) / delta + 2;
				break;
			case bNorm:
				hue = (rNorm - gNorm) / delta + 4;
				break;
		}
		hue *= 60;
	}

	return {
		h: Math.round(hue),
		s: Math.round(saturation * 100),
		l: Math.round(lightness * 100),
	};
};

/**
 * Convert an HSLColor object to a hexadecimal color string.
 *
 * @param hsl - HSLColor object.
 * @returns Hexadecimal color string.
 *
 * @example
 * hslToHex({ h: 0, s: 100, l: 50 }) => "#ff0000"
 */
export const hslToHex = ({ h, s, l }: HSLColor): string => {
	if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
		return "#000000";
	}

	const saturation = s / 100;
	const lightness = l / 100;

	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const hPrime = h / 60;
	const x = chroma * (1 - Math.abs((hPrime % 2) - 1));

	let r = 0,
		g = 0,
		b = 0;

	if (hPrime >= 0 && hPrime < 1) {
		r = chroma;
		g = x;
	} else if (hPrime >= 1 && hPrime < 2) {
		r = x;
		g = chroma;
	} else if (hPrime >= 2 && hPrime < 3) {
		g = chroma;
		b = x;
	} else if (hPrime >= 3 && hPrime < 4) {
		g = x;
		b = chroma;
	} else if (hPrime >= 4 && hPrime < 5) {
		r = x;
		b = chroma;
	} else if (hPrime >= 5 && hPrime < 6) {
		r = chroma;
		b = x;
	}

	const m = lightness - chroma / 2;

	const red = sanitizeColorComponent(Math.round((r + m) * 255));
	const green = sanitizeColorComponent(Math.round((g + m) * 255));
	const blue = sanitizeColorComponent(Math.round((b + m) * 255));

	return rgbToHex({ r: red, g: green, b: blue });
};
