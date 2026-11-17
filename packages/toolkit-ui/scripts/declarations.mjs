// Makes the published declarations (dist/**/*.d.ts) usable with every TypeScript module setting, for a package with
// "type": "module" and a CommonJS build. Used by api, toolkit-types, toolkit-ui and atoms.
// - addDeclarationExtensions: TypeScript writes relative specifiers without an extension ('./lib/fetch'), which
//   "moduleResolution": "node16" / "nodenext" cannot follow from an ES module: the host saw no export at all. Each
//   becomes './lib/fetch.js' (or './lib/fetch/index.js' for a folder), which every module setting resolves to the
//   matching .d.ts.
// - copyCommonJsDeclarations: in a "type": "module" package every .d.ts describes an ES module, so a CommonJS caller
//   (import x = require(...), a .cts file) was refused. A copy of the declarations under dist/cjs, beside a
//   package.json of { "type": "commonjs" }, describes the CommonJS build: the "require" condition of "exports" points
//   its "types" there.
import fs from 'node:fs';
import path from 'node:path';

const RELATIVE_SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]*)\2/g;
const HAS_JS_EXTENSION = /\.[cm]?js$/;

function declarationFiles(dir, skipDir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (full === skipDir) {
				return [];
			}
			return declarationFiles(full, skipDir);
		}
		if (entry.name.endsWith('.d.ts')) {
			return [full];
		}
		return [];
	});
}

function withExtension(fromFile, specifier) {
	if (HAS_JS_EXTENSION.test(specifier)) {
		return specifier;
	}
	const target = path.resolve(path.dirname(fromFile), specifier);
	if (fs.existsSync(`${target}.d.ts`)) {
		return `${specifier}.js`;
	}
	if (fs.existsSync(path.join(target, 'index.d.ts'))) {
		return `${specifier.replace(/\/$/, '')}/index.js`;
	}
	return specifier;
}

// Returns the number of files rewritten.
export function addDeclarationExtensions(distDir, skipDir) {
	let rewritten = 0;
	for (const file of declarationFiles(path.resolve(distDir), skipDir && path.resolve(skipDir))) {
		const source = fs.readFileSync(file, 'utf8');
		const resolved = source.replace(
			RELATIVE_SPECIFIER,
			(_match, keyword, quote, specifier) => `${keyword}${quote}${withExtension(file, specifier)}${quote}`
		);
		if (resolved !== source) {
			fs.writeFileSync(file, resolved);
			rewritten += 1;
		}
	}
	return rewritten;
}

// Copies every declaration of distDir (except those already in cjsDir) to cjsDir, and marks cjsDir as CommonJS.
// Returns the number of files copied.
export function copyCommonJsDeclarations(distDir, cjsDir) {
	const from = path.resolve(distDir);
	const to = path.resolve(cjsDir);
	const files = declarationFiles(from, to);
	for (const file of files) {
		const target = path.join(to, path.relative(from, file));
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.copyFileSync(file, target);
	}
	fs.mkdirSync(to, { recursive: true });
	fs.writeFileSync(path.join(to, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, '\t')}\n`);
	return files.length;
}

// For a build whose declarations are complete once its ES output is written.
export function publishedDeclarations({ distDir = 'dist', cjsDir = 'dist/cjs' } = {}) {
	return {
		name: 'published-declarations',
		writeBundle() {
			addDeclarationExtensions(distDir, cjsDir);
			copyCommonJsDeclarations(distDir, cjsDir);
		}
	};
}
