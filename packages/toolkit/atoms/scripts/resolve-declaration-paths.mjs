// Rewrites the path aliases in the published declarations (dist/**/*.d.ts) to relative paths: the source imports
// @components/..., @hooks/..., @lib/... (tsconfig.json "paths"), which a host's TypeScript cannot resolve.
// Run by the rollup build after the declarations are written.
import fs from 'node:fs';
import path from 'node:path';

// tsconfig.json "paths", relative to src/ (which is dist/ once built).
export const DECLARATION_ALIASES = {
	'@components/': 'lib/components/',
	'@hooks/': 'lib/hooks/',
	'@libs/': 'lib/libs/',
	'@lib/': 'lib/',
	'@utils/': 'lib/utils/'
};

const ALIASED_SPECIFIER =
	/(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(@(?:components|hooks|libs|lib|utils)\/[^'"]+)\2/g;

function relativeSpecifier(fromFile, distDir, specifier) {
	const alias = Object.keys(DECLARATION_ALIASES).find((prefix) => specifier.startsWith(prefix));
	const target = path.join(distDir, DECLARATION_ALIASES[alias], specifier.slice(alias.length));
	const relative = path.relative(path.dirname(fromFile), target).split(path.sep).join('/');
	if (relative.startsWith('.')) {
		return relative;
	}
	return `./${relative}`;
}

function declarationFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			return declarationFiles(full);
		}
		if (entry.name.endsWith('.d.ts')) {
			return [full];
		}
		return [];
	});
}

// Returns the number of files rewritten.
export function resolveDeclarationPaths(distDir) {
	let rewritten = 0;
	for (const file of declarationFiles(distDir)) {
		const source = fs.readFileSync(file, 'utf8');
		const resolved = source.replace(
			ALIASED_SPECIFIER,
			(_match, keyword, quote, specifier) =>
				`${keyword}${quote}${relativeSpecifier(file, distDir, specifier)}${quote}`
		);
		if (resolved !== source) {
			fs.writeFileSync(file, resolved);
			rewritten += 1;
		}
	}
	return rewritten;
}
