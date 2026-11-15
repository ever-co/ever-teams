// Test-only resolve hooks for `node --test`: the extension's `~` imports (Plasmo's alias of its root) resolve to its
// TypeScript files, and `~misc/browser` to a stand-in that reads the `chrome` a test installs.
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
	for (const extension of ['.ts', '/index.ts']) {
		try {
			return await nextResolve(new URL(`${path}${extension}`, ROOT).href, context);
		} catch {
			// The next form of the path
		}
	}
	return nextResolve(specifier, context);
}
