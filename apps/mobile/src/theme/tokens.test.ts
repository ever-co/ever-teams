/**
 * The phone app draws with the web's palette: every token must keep the web's value in both themes, and every text
 * token must stay readable on the background it is drawn on.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { ColorScheme, ColorToken, webColorTokens } from './tokens';

const WEB_GLOBALS = join(__dirname, '../../../web/styles/globals.css');

function tokensOfBlock(css: string, selector: ':root' | '.dark'): Record<string, string> {
	const start = css.indexOf(`\t${selector} {\n\t\t--background:`);
	const end = css.indexOf('\n\t}', start);
	const block = css.slice(start, end);
	const values: Record<string, string> = {};
	for (const match of block.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
		values[match[1]] = match[2].trim();
	}
	return values;
}

function relativeLuminance(triplet: string): number {
	const [h, s, l] = triplet.replace(/%/g, '').split(' ').map(Number);
	const saturation = s / 100;
	const lightness = l / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lightness - chroma / 2;
	const sector = Math.floor(h / 60) % 6;
	const table: Array<[number, number, number]> = [
		[chroma, x, 0],
		[x, chroma, 0],
		[0, chroma, x],
		[0, x, chroma],
		[x, 0, chroma],
		[chroma, 0, x]
	];
	const [r, g, b] = table[sector].map((channel) => channel + m);
	const linear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(foreground: string, background: string): number {
	const a = relativeLuminance(foreground);
	const b = relativeLuminance(background);
	const lighter = Math.max(a, b);
	const darker = Math.min(a, b);
	return (lighter + 0.05) / (darker + 0.05);
}

describe('design tokens', () => {
	// a Windows checkout can have CRLF line ends, and the blocks are found by their line breaks
	const css = readFileSync(WEB_GLOBALS, 'utf8').replace(/\r\n/g, '\n');
	const web: Record<ColorScheme, Record<string, string>> = {
		light: tokensOfBlock(css, ':root'),
		dark: tokensOfBlock(css, '.dark')
	};

	for (const scheme of ['light', 'dark'] as ColorScheme[]) {
		it(`keeps the web's ${scheme} values`, () => {
			for (const [token, value] of Object.entries(webColorTokens[scheme])) {
				expect([token, web[scheme][token]]).toEqual([token, value]);
			}
		});

		const readablePairs: Array<[ColorToken, ColorToken]> = [
			['foreground', 'background'],
			['foreground', 'card'],
			['muted-foreground', 'background'],
			['muted-foreground', 'card'],
			['primary-ink', 'background'],
			['destructive-ink', 'card'],
			['success-foreground', 'background'],
			['warning-foreground', 'background'],
			['info-foreground', 'background'],
			['primary-foreground', 'primary']
		];
		for (const [text, surface] of readablePairs) {
			const minimum = text === 'primary-foreground' ? 3 : 4.5;
			it(`draws ${text} on ${surface} at ${minimum}:1 or more in ${scheme}`, () => {
				const ratio = contrast(webColorTokens[scheme][text], webColorTokens[scheme][surface]);
				expect(ratio).toBeGreaterThanOrEqual(minimum);
			});
		}
	}
});
