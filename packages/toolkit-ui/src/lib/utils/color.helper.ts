type RGB = [number, number, number];

const colorNames: { [key: string]: string } = {
	black: '#000000',
	white: '#ffffff',
	red: '#ff0000',
	green: '#008000',
	blue: '#0000ff',
	yellow: '#ffff00',
	cyan: '#00ffff',
	magenta: '#ff00ff',
	silver: '#c0c0c0',
	gray: '#808080',
	maroon: '#800000',
	olive: '#808000',
	purple: '#800080',
	teal: '#008080',
	navy: '#000080'
};

// Convert a hexadecimal color to RGB
function hexToRgb(hex: string): RGB {
	let bigint = parseInt(hex.slice(1), 16);
	let r = (bigint >> 16) & 255;
	let g = (bigint >> 8) & 255;
	let b = bigint & 255;
	return [r, g, b];
}

// Convert an RGB color to hexadecimal
function rgbToHex([r, g, b]: RGB): string {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Convert a named color to its hexadecimal representation
function nameToHex(colorName: string): string | null {
	return colorNames[colorName.toLowerCase()] || null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	r /= 255;
	g /= 255;
	b /= 255;
	let max: number = Math.max(r, g, b),
		min: number = Math.min(r, g, b);
	let h: number = 0,
		s: number,
		l: number = (max + min) / 2;

	if (max === min) {
		h = s = 0; // achromatic
	} else {
		let d: number = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h = Math.round(h * 60);
	}

	return { h: h % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	s /= 100;
	l /= 100;
	let c: number = (1 - Math.abs(2 * l - 1)) * s;
	let x: number = c * (1 - Math.abs(((h / 60) % 2) - 1));
	let m: number = l - c / 2;
	let r: number = 0,
		g: number = 0,
		b: number = 0;

	if (h >= 0 && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h >= 60 && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h >= 120 && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h >= 180 && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h >= 240 && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else if (h >= 300 && h < 360) {
		r = c;
		g = 0;
		b = x;
	}

	return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// Determine if the color is a named color or a hexadecimal and convert to RGB
function parseColor(color: string): RGB | null {
	if (color.startsWith('#')) {
		return hexToRgb(color);
	} else {
		const hexColor = nameToHex(color);
		return hexColor ? hexToRgb(hexColor) : null;
	}
}

function generateShades(color: string, n: number): string[] {
	// Generate n shades of a given color
	const rgb = parseColor(color);
	if (!rgb) {
		throw new Error('Invalid color format.');
	}

	const [r, g, b] = rgb;
	let shades: string[] = [];

	for (let i = 0; i < n; i++) {
		let factor = i / (n - 1);
		let newR = Math.round(r * factor);
		let newG = Math.round(g * factor);
		let newB = Math.round(b * factor);
		shades.push(rgbToHex([newR, newG, newB]));
	}

	return shades;
}

function generateRandomColors(baseColor: string, numColors: number): string[] {
	// Convert the base color to RGB
	const baseRgb = hexToRgb(baseColor);
	if (!baseRgb) {
		throw new Error('Invalid base color format. Please provide a valid hex color.');
	}

	// Convert base color to HSL for better color distribution
	const baseHsl = rgbToHsl(baseRgb[0], baseRgb[1], baseRgb[2]);

	// Initialize the colors array with the base color
	const colors: string[] = [baseColor];

	// Generate distinct colors by rotating the hue value evenly around the color wheel
	for (let i = 1; i < numColors; i++) {
		let newHue = (baseHsl.h + (360 / numColors) * i) % 360; // Evenly distribute hues
		let newHsl = {
			h: newHue,
			s: baseHsl.s,
			l: baseHsl.l
		};
		let newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
		colors.push(rgbToHex(newRgb));
	}

	console.log('Generated color : ', colors);

	return colors;
}

export { generateShades, generateRandomColors };
