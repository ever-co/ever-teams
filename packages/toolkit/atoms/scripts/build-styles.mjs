// Builds dist/styles.css: the kit's classes compiled with Tailwind CSS 4 (src/styles/kit.css), then scoped so that
// nothing reaches the host page:
// - every rule applies only inside a kit root ([data-ever-teams-kit], rendered by <TeamsProvider scopedStyles>);
// - the :root and :host tokens are declared on the kit root instead;
// - cascade layers are flattened: a host's unlayered CSS would otherwise beat every layered kit rule.
// Usage: node scripts/build-styles.mjs (run by `yarn build` after rollup)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(here, '..');
const require = createRequire(path.join(packageDir, 'package.json'));
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');

export const KIT_ROOT = '[data-ever-teams-kit]';

// Rules inside these at-rules describe animations or registered properties, not elements: they stay as they are.
const KEEP_AS_IS = new Set(['keyframes', 'property', 'font-face', 'counter-style']);

function insideKeptAtRule(node) {
	for (let parent = node.parent; parent; parent = parent.parent) {
		const keep = parent.type === 'atrule' && KEEP_AS_IS.has(parent.name.replace(/^-\w+-/, ''));
		if (keep) {
			return true;
		}
	}
	return false;
}

export function scopeSelector(selector) {
	const trimmed = selector.trim();
	const alreadyScoped = trimmed.includes(KIT_ROOT);
	if (alreadyScoped) {
		return trimmed;
	}
	const isDocumentRoot = trimmed === ':root' || trimmed === ':host' || trimmed === 'html';
	if (isDocumentRoot) {
		return KIT_ROOT;
	}
	return `${KIT_ROOT} ${trimmed}`;
}

// Applies the scoping to a compiled stylesheet (a postcss Root).
export function scopeStylesheet(root) {
	root.walkAtRules('layer', (atRule) => {
		const isStatement = !atRule.nodes;
		if (isStatement) {
			atRule.remove();
			return;
		}
		atRule.replaceWith(atRule.nodes);
	});
	root.walkRules((rule) => {
		if (insideKeptAtRule(rule)) {
			return;
		}
		const scoped = rule.selectors.map(scopeSelector);
		rule.selectors = [...new Set(scoped)];
	});
	return root;
}

export async function buildStyles({
	entry = path.join(packageDir, 'src', 'styles', 'kit.css'),
	output = path.join(packageDir, 'dist', 'styles.css')
} = {}) {
	const source = fs.readFileSync(entry, 'utf8');
	const compiled = await postcss([tailwindcss({ base: packageDir, optimize: { minify: true } })]).process(source, {
		from: entry
	});
	const scoped = scopeStylesheet(postcss.parse(compiled.css, { from: entry }));
	fs.mkdirSync(path.dirname(output), { recursive: true });
	fs.writeFileSync(output, scoped.toString());
	return output;
}

const runDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
	const output = await buildStyles();
	console.log(`wrote ${path.relative(packageDir, output)} (${fs.statSync(output).size} bytes)`);
}
