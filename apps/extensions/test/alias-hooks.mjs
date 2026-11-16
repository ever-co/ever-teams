// Test-only hooks for `node --test`: the extension's `~` imports (Plasmo's alias of its root) resolve to its
// TypeScript files, and `~misc/browser` to a stand-in that reads the `chrome` a test installs. What Node's type
// stripping cannot run is compiled with TypeScript: a `.tsx` file (a popup component, JSX) and a file declaring an
// enum. Node 26 has no flag to transform them itself (--experimental-transform-types was removed).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const FAKE_BROWSER = new URL('./fake-browser.ts', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
	if (specifier === '~misc/browser') {
		return { url: FAKE_BROWSER, shortCircuit: true };
	}
	if (!specifier.startsWith('~')) {
		return nextResolve(specifier, context);
	}
	const path = specifier.slice(1);
	for (const extension of ['.ts', '.tsx', '/index.ts']) {
		try {
			return await nextResolve(new URL(`${path}${extension}`, ROOT).href, context);
		} catch {
			// The next form of the path
		}
	}
	return nextResolve(specifier, context);
}

// Any file that names an enum (compiling one more file than needed is harmless): a plain pattern, no backtracking
const ENUM = /\benum\s/;

export async function load(url, context, nextLoad) {
	if (!url.startsWith('file:')) {
		return nextLoad(url, context);
	}
	const { pathname } = new URL(url);
	const isTsx = pathname.endsWith('.tsx');
	if (!isTsx && !pathname.endsWith('.ts')) {
		return nextLoad(url, context);
	}
	const source = await readFile(fileURLToPath(url), 'utf8');
	if (!isTsx && !ENUM.test(source)) {
		return nextLoad(url, context);
	}
	const { default: ts } = await import('typescript');
	const { outputText } = ts.transpileModule(source, {
		fileName: fileURLToPath(url),
		compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
	});
	return { format: 'module', source: outputText, shortCircuit: true };
}
