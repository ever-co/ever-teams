import { Presence, presenceColorOf, presenceInkOf } from './presence';
import { ColorScheme, hsl, webColorTokens } from './tokens';
import { themeFor } from './use-theme';

const light = themeFor('light');

describe("a member's presence", () => {
	it('shows working in the success color', () => {
		expect(presenceColorOf('online', light)).toBe(light.colors.success);
		expect(presenceColorOf('running', light)).toBe(light.colors.success);
	});

	it('shows a pause in the warning color', () => {
		expect(presenceColorOf('pause', light)).toBe(light.colors.warning);
	});

	it('shows idle in muted gray, never in red', () => {
		const idle = presenceColorOf('idle', light);

		expect(idle).toBe(hsl(webColorTokens.light['muted-foreground'], 0.6));
		expect(idle).not.toBe(light.colors.destructive);
	});

	it('shows suspended fainter than idle', () => {
		expect(presenceColorOf('suspended', themeFor('dark'))).toBe(hsl(webColorTokens.dark['muted-foreground'], 0.3));
	});

	it.each(['light', 'dark'] as ColorScheme[])(
		'draws every badge icon at 3:1 at least on its fill in %s',
		(scheme) => {
			const theme = themeFor(scheme);
			const card = rgbOf(theme.colors.card);
			const presences: Presence[] = ['running', 'pause', 'idle', 'suspended'];

			for (const presence of presences) {
				const fill = over(rgbaOf(presenceColorOf(presence, theme)), card);
				const ink = rgbOf(presenceInkOf(presence, theme));

				expect(contrast(ink, fill)).toBeGreaterThanOrEqual(3);
			}
		}
	);
});

type Rgb = [number, number, number];

function rgbaOf(color: string): { rgb: Rgb; alpha: number } {
	const [h, s, l, a] = color
		.replace(/hsla?\(|\)|%/g, '')
		.split(',')
		.map(Number);
	const chroma = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
	const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l / 100 - chroma / 2;
	const table: Rgb[] = [
		[chroma, x, 0],
		[x, chroma, 0],
		[0, chroma, x],
		[0, x, chroma],
		[x, 0, chroma],
		[chroma, 0, x]
	];
	const sector = table[Math.floor(h / 60) % 6];
	const rgb = sector.map((channel) => channel + m) as Rgb;
	const alpha = Number.isNaN(a) || a === undefined ? 1 : a;
	return { rgb, alpha };
}

function rgbOf(color: string): Rgb {
	return rgbaOf(color).rgb;
}

function over(color: { rgb: Rgb; alpha: number }, base: Rgb): Rgb {
	return color.rgb.map((channel, index) => channel * color.alpha + base[index] * (1 - color.alpha)) as Rgb;
}

function luminance(rgb: Rgb): number {
	const linear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
	return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

function contrast(a: Rgb, b: Rgb): number {
	const lighter = Math.max(luminance(a), luminance(b));
	const darker = Math.min(luminance(a), luminance(b));
	return (lighter + 0.05) / (darker + 0.05);
}
