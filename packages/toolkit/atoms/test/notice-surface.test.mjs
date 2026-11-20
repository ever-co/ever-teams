// The kit's notices stay readable in either color scheme over any host page (#5575): they are drawn on the kit's own
// background with their tint laid over it, and their action is light enough in the dark scheme. Builds the
// stylesheet: node --test test/*.test.mjs (from packages/toolkit/atoms).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildStyles } from '../scripts/build-styles.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const esbuild = require('esbuild');

/** The notice surface module, compiled from its source. */
async function noticeSurface() {
	const file = new URL('../src/lib/components/teams-ui-components/notice-surface.ts', import.meta.url);
	const { code } = await esbuild.transform(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'esm' });
	return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

/** The built stylesheet, parsed, built in a folder of its own. */
async function builtStylesheet() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-notice-'));
	try {
		const output = path.join(dir, 'styles.css');
		await buildStyles({ output });
		return postcss.parse(fs.readFileSync(output, 'utf8'));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * The values a class's own rules give `property`, its selector read without escapes: the class alone, not a variant
 * of it (`:hover`, `/50`). An arbitrary class may hold commas, so the selector is not split on them.
 */
function valuesOf(root, className, property) {
	const values = [];
	root.walkRules((rule) => {
		const selector = rule.selector.replace(/\\/g, '');
		const at = selector.indexOf(` .${className}`);
		if (at === -1) {
			return;
		}
		const after = selector[at + className.length + 2];
		const isOwnRule = after === undefined || after === ',' || after === ' ';
		if (!isOwnRule) {
			return;
		}
		rule.walkDecls(property, (declaration) => values.push(declaration.value));
	});
	return values;
}

/** The WCAG contrast of two sRGB colors given as [r, g, b] in 0..255. */
function contrast(first, second) {
	const luminance = (rgb) => {
		const [r, g, b] = rgb.map((channel) => {
			const c = channel / 255;
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return (lighter + 0.05) / (darker + 0.05);
}

/** hsl(h s% l%) as sRGB [r, g, b]. */
function rgbOfHsl(h, s, l) {
	const saturation = s / 100;
	const lightness = l / 100;
	const k = (n) => (n + h / 30) % 12;
	const a = saturation * Math.min(lightness, 1 - lightness);
	const f = (n) => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [f(0), f(8), f(4)].map((channel) => Math.round(channel * 255));
}

test('each notice tone draws on the kit background, its tint laid over it, never on transparency', async () => {
	const { kitNoticeTone } = await noticeSurface();
	const root = await builtStylesheet();

	assert.deepEqual(valuesOf(root, 'bg-background', 'background-color'), ['hsl(var(--background))']);
	for (const [tone, color] of [
		['neutral', '--foreground'],
		['error', '--destructive']
	]) {
		const classes = kitNoticeTone(tone).split(' ');
		const tint = classes.find((className) => className.startsWith('bg-[linear-gradient'));

		assert.ok(classes.includes('bg-background'), tone);
		const images = valuesOf(root, tint, 'background-image');
		assert.equal(images.length, 1, `${tone}: the built stylesheet lays ${tint}`);
		assert.ok(images[0].includes(`hsl(var(${color})/`), `${tone}: ${images[0]}`);
		assert.deepEqual(valuesOf(root, tint, 'background-color'), [], `${tone}: the tint sets no background color`);
	}
});

test("a notice's action takes the kit's light purple in the dark scheme, and only there", async () => {
	const { KIT_NOTICE_ACTION } = await noticeSurface();
	const root = await builtStylesheet();
	const darkRules = [];
	root.walkRules((rule) => {
		if (rule.selector.replace(/\\/g, '').includes('.dark:text-primary-xlight')) {
			rule.walkDecls('color', (declaration) => darkRules.push({ selector: rule.selector, value: declaration.value }));
		}
	});

	assert.ok(KIT_NOTICE_ACTION.split(' ').includes('dark:text-primary-xlight'));
	assert.equal(darkRules.length, 1);
	assert.match(darkRules[0].selector, /data-ever-teams-color-scheme=['"]?dark/);
	assert.equal(darkRules[0].value.toLowerCase(), '#8e76fa');
});

test('that light purple reads at 4.5:1 or more on the dark notice surface', () => {
	// The dark scheme's background (kit.css: --background 224 71% 4%); the 5 % tint barely moves it.
	const darkBackground = rgbOfHsl(224, 71, 4);
	const lightPurple = [0x8e, 0x76, 0xfa];

	assert.ok(contrast(lightPurple, darkBackground) >= 4.5, `contrast ${contrast(lightPurple, darkBackground)}`);
});
