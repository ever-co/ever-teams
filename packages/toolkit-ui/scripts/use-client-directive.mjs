// A Rollup plugin for builds with preserveModules: each source module that starts with a "use client" directive keeps
// it at the top of its own output file, which Next.js needs to treat the module as a client component. Rollup would
// drop the directive with a MODULE_LEVEL_DIRECTIVE warning; the plugin takes it out of the source, so there is nothing
// to warn about, and writes it back once the output file is rendered and minified. Used by toolkit-ui and atoms.

// The directive, after any leading comments (a /** @jsxImportSource */ pragma, a license header).
const LEADING_DIRECTIVE = /^((?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*)(['"])use client\2;?/;

export function useClientDirective() {
	const clientModules = new Set();
	return {
		name: 'use-client-directive',
		transform(code, id) {
			if (!LEADING_DIRECTIVE.test(code)) {
				return null;
			}
			clientModules.add(id);
			return { code: code.replace(LEADING_DIRECTIVE, '$1'), map: null };
		},
		renderChunk(code, chunk) {
			const holdsClientModule = chunk.moduleIds.some((id) => clientModules.has(id));
			if (!holdsClientModule) {
				return null;
			}
			return { code: `'use client';\n${code}`, map: null };
		}
	};
}
