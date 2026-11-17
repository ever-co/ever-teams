// Builds dist/styles.css: the kit's classes compiled with Tailwind CSS 4 (src/styles/kit.css), then scoped so that
// nothing reaches the host page:
// - every rule applies only inside a kit root ([data-ever-teams-kit], rendered by <TeamsProvider scopedStyles>);
// - the :root and :host tokens are declared on the kit root instead;
// - cascade layers are flattened, in their order: a host's unlayered CSS would otherwise beat every layered kit rule;
// - keyframes and registered custom properties, which apply to the whole document whatever the selectors, get
//   names of their own, so they neither replace a host's nor change how a host's properties inherit.
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
export const KIT_KEYFRAMES_PREFIX = 'ever-teams-kit-';
export const KIT_PROPERTY_PREFIX = '--ever-teams-tw-';
const TAILWIND_PROPERTY_PREFIX = '--tw-';

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

function escapeForPattern(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Prefixes every @keyframes name, and the names in animation values, including those kept in custom properties
// (Tailwind's --animate-spin: spin 1s linear infinite).
export function renameKeyframes(root) {
	const names = new Set();
	root.walkAtRules(/keyframes$/i, (atRule) => {
		const name = atRule.params.trim();
		if (name.startsWith(KIT_KEYFRAMES_PREFIX)) {
			return;
		}
		names.add(name);
		atRule.params = KIT_KEYFRAMES_PREFIX + name;
	});
	if (names.size === 0) {
		return root;
	}
	const alternatives = [...names].map(escapeForPattern).join('|');
	const nameAsWord = new RegExp(`(^|[\\s,])(${alternatives})(?=$|[\\s,])`, 'g');
	root.walkDecls((decl) => {
		const carriesNames = /^animation(-name)?$/i.test(decl.prop) || decl.prop.startsWith('--');
		if (carriesNames) {
			decl.value = decl.value.replace(nameAsWord, `$1${KIT_KEYFRAMES_PREFIX}$2`);
		}
	});
	return root;
}

// Renames Tailwind's --tw-* properties, declared, read and registered with @property: a registration applies to the
// whole document, so the kit's would otherwise change how a host's own --tw-* values inherit.
export function renameRegisteredProperties(root) {
	const rename = (text) => text.split(TAILWIND_PROPERTY_PREFIX).join(KIT_PROPERTY_PREFIX);
	root.walkAtRules('property', (atRule) => {
		atRule.params = rename(atRule.params);
	});
	root.walkDecls((decl) => {
		decl.prop = rename(decl.prop);
		decl.value = rename(decl.value);
	});
	return root;
}

// Removes the cascade layers but keeps the order they gave: the rules of each layer come after those of the layers
// declared before it, and unlayered rules after every layer, as they beat them. A layered rule then still loses to a
// rule of the same specificity from a later layer, e.g. the kit's reset (base) to the space-y-* utilities, whose
// :where() selectors add no specificity of their own.
export function flattenLayers(root) {
	const order = [];
	const rulesOf = new Map();
	const declare = (name) => {
		if (!rulesOf.has(name)) {
			order.push(name);
			rulesOf.set(name, []);
		}
	};
	root.each((node) => {
		const isLayer = node.type === 'atrule' && node.name === 'layer';
		if (!isLayer) {
			return;
		}
		const names = node.params
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean);
		if (node.nodes) {
			// An anonymous layer is a layer of its own.
			const name = names[0] ?? Symbol('anonymous layer');
			declare(name);
			rulesOf.get(name).push(...node.nodes);
		} else {
			names.forEach(declare);
		}
		node.remove();
	});
	const layered = order.flatMap((name) => rulesOf.get(name));
	const firstUnlayered = root.nodes.find((node) => node.type !== 'comment');
	if (firstUnlayered) {
		firstUnlayered.before(layered);
	} else {
		root.append(layered);
	}
	// A layer nested in another at-rule (Tailwind writes none) is unwrapped where it is.
	root.walkAtRules('layer', (atRule) => {
		if (atRule.nodes) {
			atRule.replaceWith(atRule.nodes);
		} else {
			atRule.remove();
		}
	});
	return root;
}

// Applies the scoping to a compiled stylesheet (a postcss Root).
export function scopeStylesheet(root) {
	flattenLayers(root);
	root.walkRules((rule) => {
		if (insideKeptAtRule(rule)) {
			return;
		}
		const scoped = rule.selectors.map(scopeSelector);
		rule.selectors = [...new Set(scoped)];
	});
	renameKeyframes(root);
	renameRegisteredProperties(root);
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
