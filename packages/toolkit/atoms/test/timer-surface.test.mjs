// The timers' surface stays opaque on hover: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the timers' container with toolkit-ui's cn replaced by a stand-in; its hover classes are looked up in
// the built stylesheet (scripts/build-styles.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { buildStyles } from '../scripts/build-styles.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const postcss = require('postcss');

let containerVariants;
let stylesheet;
let bundleDir;

before(async () => {
	// Inside the package, so that the bundle's react and class-variance-authority resolve to the package's own.
	bundleDir = fs.mkdtempSync(path.join(here, '.timer-surface-'));
	const outfile = path.join(bundleDir, 'container.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'teams-time-trackers', 'common', 'container.tsx')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		plugins: [
			{
				name: 'stand-ins',
				setup(build) {
					build.onResolve({ filter: /^@ever-teams\/toolkit-ui$/ }, () => ({
						path: 'toolkit-ui',
						namespace: 'stand-in'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stand-in' }, () => ({
						contents: "export const cn = (...classes) => classes.filter(Boolean).join(' ');",
						loader: 'js'
					}));
				}
			}
		]
	});
	({ containerVariants } = await import(pathToFileURL(outfile).href));
	const stylesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timer-surface-'));
	try {
		const output = path.join(stylesDir, 'styles.css');
		await buildStyles({ output });
		stylesheet = postcss.parse(fs.readFileSync(output, 'utf8'));
	} finally {
		fs.rmSync(stylesDir, { recursive: true, force: true });
	}
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

// The declarations the stylesheet gives a class, as Tailwind escapes it in a selector.
function declarationsOf(className) {
	const escaped = `.${className.replace(/[^\w-]/g, '\\$&')}`;
	const declarations = [];
	stylesheet.walkRules((rule) => {
		const selectsClass = rule.selectors.some((selector) => selector.split(':hover')[0].endsWith(escaped));
		if (selectsClass) {
			rule.walkDecls((decl) => declarations.push(decl.prop));
		}
	});
	return declarations;
}

test('on hover the timer card keeps its own background color, under a tint drawn over it', () => {
	for (const background of [undefined, 'primary', 'secondary', 'destructive']) {
		const hoverClasses = containerVariants({ background })
			.split(/\s+/)
			.filter((className) => className.startsWith('hover:bg-'));

		assert.ok(hoverClasses.length > 0, `a hover tint for background=${background}`);
		for (const className of hoverClasses) {
			assert.ok(declarationsOf(className).length > 0, `${className} is in the stylesheet`);
			assert.deepEqual(
				declarationsOf(className).filter((prop) => prop.startsWith('background-color')),
				[],
				className
			);
		}
	}
});
