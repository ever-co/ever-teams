#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const PAGE_LAYOUT_FILE = /^apps\/web\/app\/(?:.*\/)?(?:page|layout)\.(?:[jt]sx?)$/;
const ROUTE_HANDLER_FILE = /^apps\/web\/app\/(?:.*\/)?route\.(?:[jt]s)$/;
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const TEST_FILE = /(?:^|\/)(?:__tests__\/.*|[^/]+\.(?:spec|test|cy|e2e))\.[cm]?[jt]sx?$/;
const BARREL_FILE = /(?:^|\/)index(?:\.d)?\.[cm]?[jt]sx?$/;
const SERVICE_FILE = /(?:^|\/)(?:services?\/.*|[^/]+\.service)\.[cm]?[jt]sx?$/;
const TEXT_FILE = /(?:\.(?:[cm]?[jt]sx?|json|ya?ml|env(?:\.[^/]*)?|sample)|(?:^|\/)Dockerfile)$/;
const WEB_SURFACE_FILE = /^(?:apps\/web|packages)\//;
const API_SERVICE_FILE = /^(?:apps\/web\/core\/services|packages\/.*services)\//;
const REMOVAL_CATEGORIES = [
	'routes',
	'overlayComponents',
	'navigation',
	'nextPublicOccurrences',
	'publicExports',
	'serviceMethods',
	'testConfiguration',
	'testNames'
];

function resolveGitExecutable() {
	const configured = process.env.EVER_TEAMS_GIT_EXECUTABLE?.trim();
	if (configured && !isAbsolute(configured)) {
		throw new Error('EVER_TEAMS_GIT_EXECUTABLE must be an absolute path');
	}
	const executableName = process.platform === 'win32' ? 'git.exe' : 'git';
	const pathCandidates = (process.env.PATH ?? '')
		.split(delimiter)
		.map((entry) => entry.trim().replace(/^"|"$/g, ''))
		.filter(Boolean)
		.map((entry) => resolve(entry, executableName));
	const knownCandidates =
		process.platform === 'win32'
			? [String.raw`C:\Program Files\Git\cmd\git.exe`, String.raw`C:\Program Files\Git\bin\git.exe`]
			: ['/usr/bin/git', '/usr/local/bin/git'];
	const gitExecutable = [configured, ...pathCandidates, ...knownCandidates]
		.filter((candidate) => candidate && isAbsolute(candidate))
		.find((candidate) => {
			try {
				return existsSync(candidate) && statSync(candidate).isFile();
			} catch {
				return false;
			}
		});

	if (!gitExecutable) {
		throw new Error(
			'Ever Teams preservation could not resolve an absolute Git executable; set EVER_TEAMS_GIT_EXECUTABLE'
		);
	}
	return gitExecutable;
}

const GIT_EXECUTABLE = resolveGitExecutable();

function runGit(cwd, args, input) {

	const result = spawnSync(GIT_EXECUTABLE, args, {
		cwd,
		input,
		encoding: input === undefined ? undefined : 'buffer',
		maxBuffer: 256 * 1024 * 1024,
		windowsHide: true
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : String(result.stderr ?? '');
		throw new Error(`git ${args.join(' ')} failed: ${stderr.trim()}`);
	}
	return result.stdout;
}

function readGitTree(cwd, ref) {
	const tree = runGit(cwd, ['ls-tree', '-r', '-z', '--full-tree', ref]);
	const entries = tree
		.toString('utf8')
		.split('\0')
		.filter(Boolean)
		.map((record) => {
			const tab = record.indexOf('\t');
			const [mode, type, object] = record.slice(0, tab).split(' ');
			return { mode, object, path: record.slice(tab + 1), type };
		})
		.filter(({ path, type }) => type === 'blob' && TEXT_FILE.test(path));

	if (entries.length === 0) return new Map();
	const batch = runGit(
		cwd,
		['cat-file', '--batch'],
		Buffer.from(entries.map(({ object }) => object).join('\n') + '\n', 'utf8')
	);
	const files = new Map();
	let offset = 0;
	for (const entry of entries) {
		const headerEnd = batch.indexOf(10, offset);
		if (headerEnd === -1) throw new Error(`Malformed git cat-file output for ${entry.path}`);
		const header = batch.subarray(offset, headerEnd).toString('utf8');
		const parts = header.split(' ');
		const size = Number(parts[2]);
		if (parts[1] !== 'blob' || !Number.isSafeInteger(size)) {
			throw new Error(`Unexpected git object for ${entry.path}: ${header}`);
		}
		const contentStart = headerEnd + 1;
		files.set(entry.path, batch.subarray(contentStart, contentStart + size).toString('utf8'));
		offset = contentStart + size + 1;
	}
	return files;
}

function compareCodePoints(left, right) {
	const leftPoints = Array.from(left, (character) => character.codePointAt(0));
	const rightPoints = Array.from(right, (character) => character.codePointAt(0));
	const length = Math.min(leftPoints.length, rightPoints.length);
	for (let index = 0; index < length; index += 1) {
		if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
	}
	return leftPoints.length - rightPoints.length;
}

function sorted(values) {
	return [...new Set(values)].sort(compareCodePoints);
}

function sortedOccurrences(values) {
	const counts = new Map();
	return [...values].sort(compareCodePoints).map((value) => {
		const ordinal = (counts.get(value) ?? 0) + 1;
		counts.set(value, ordinal);
		return `${value}::#${ordinal}`;
	});
}

function parseSource(path, source) {
	let scriptKind = ts.ScriptKind.TS;
	if (/\.tsx$/.test(path)) scriptKind = ts.ScriptKind.TSX;
	else if (/\.[cm]?jsx$/.test(path)) scriptKind = ts.ScriptKind.JSX;
	else if (/\.[cm]?js$/.test(path)) scriptKind = ts.ScriptKind.JS;
	return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind);
}

function collectRoutes(path, source) {
	if (PAGE_LAYOUT_FILE.test(path)) return [path];
	if (!ROUTE_HANDLER_FILE.test(path)) return [];
	const routes = [path];
	const sourceFile = parseSource(path, source);
	const add = (name) => {
		if (HTTP_METHODS.has(name)) routes.push(`${path}::${name}`);
	};
	for (const statement of sourceFile.statements) {
		if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.exportClause) {
			if (ts.isNamedExports(statement.exportClause)) {
				for (const element of statement.exportClause.elements) if (!element.isTypeOnly) add(element.name.text);
			}
			continue;
		}
		if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
		if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isEnumDeclaration(statement)) &&
			statement.name
		) {
			add(statement.name.text);
		} else if (ts.isVariableStatement(statement)) {
			const names = [];
			for (const declaration of statement.declarationList.declarations)
				collectBindingNames(declaration.name, names);
			for (const name of names) add(name);
		}
	}
	return routes;
}

function hasModifier(node, kind) {
	return node.modifiers?.some((modifier) => modifier.kind === kind) === true;
}

function publicMemberName(member, sourceFile) {
	if (!member.name || ts.isPrivateIdentifier(member.name)) return undefined;
	if (hasModifier(member, ts.SyntaxKind.PrivateKeyword) || hasModifier(member, ts.SyntaxKind.ProtectedKeyword)) {
		return undefined;
	}
	if (ts.isIdentifier(member.name) || ts.isStringLiteralLike(member.name) || ts.isNumericLiteral(member.name)) {
		return member.name.text;
	}
	return member.name.getText(sourceFile);
}

function collectServiceMethods(path, source) {
	const methods = [];
	const sourceFile = parseSource(path, source);
	const callables = new Set();
	const serviceInstances = new Set();
	const serviceObjects = new Map();
	const exportedBindings = [];
	const objectCallableMembers = (initializer) => {
		initializer = unwrapExpression(initializer);
		if (!ts.isObjectLiteralExpression(initializer)) return undefined;
		const members = new Set();
		for (const property of initializer.properties) {
			const name = propertyName(property);
			if (!name) continue;
			if (ts.isMethodDeclaration(property)) members.add(name);
			else if (
				ts.isPropertyAssignment(property) &&
				(ts.isArrowFunction(unwrapExpression(property.initializer)) ||
					ts.isFunctionExpression(unwrapExpression(property.initializer)))
			) {
				members.add(name);
			} else if (ts.isShorthandPropertyAssignment(property) && callables.has(property.name.text)) {
				members.add(name);
			}
		}
		return members;
	};

	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) callables.add(statement.name.text);
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
				const initializer = unwrapExpression(declaration.initializer);
				if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
					callables.add(declaration.name.text);
				} else if (ts.isNewExpression(initializer)) {
					serviceInstances.add(declaration.name.text);
				}
			}
		}
	}
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
			const members = objectCallableMembers(declaration.initializer);
			if (members) serviceObjects.set(declaration.name.text, members);
		}
	}

	const exportBinding = (outwardName, localName) => {
		if (callables.has(localName)) exportedBindings.push({ kind: 'callable', outwardName });
		if (serviceInstances.has(localName)) exportedBindings.push({ kind: 'instance', outwardName });
		const members = serviceObjects.get(localName);
		if (members) exportedBindings.push({ kind: 'object', members, outwardName });
	};
	for (const statement of sourceFile.statements) {
		if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause) {
			if (ts.isNamedExports(statement.exportClause) && !statement.isTypeOnly) {
				for (const element of statement.exportClause.elements) {
					if (!element.isTypeOnly)
						exportBinding(element.name.text, element.propertyName?.text ?? element.name.text);
				}
			}
			continue;
		}
		if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
			const expression = unwrapExpression(statement.expression);
			if (ts.isIdentifier(expression)) exportBinding('default', expression.text);
			else if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
				exportedBindings.push({ kind: 'callable', outwardName: 'default' });
			} else if (ts.isNewExpression(expression)) {
				exportedBindings.push({ kind: 'instance', outwardName: 'default' });
			}
			continue;
		}
		if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
		if (ts.isFunctionDeclaration(statement)) {
			const outwardName = hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : statement.name?.text;
			if (outwardName) exportedBindings.push({ kind: 'callable', outwardName });
		} else if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) exportBinding(declaration.name.text, declaration.name.text);
			}
		}
	}
	for (const binding of exportedBindings) {
		if (binding.kind === 'callable' || binding.kind === 'instance') methods.push(`${path}::${binding.outwardName}`);
		else for (const member of binding.members) methods.push(`${path}::${binding.outwardName}.${member}`);
	}

	const visit = (node) => {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
			const className = node.name?.text ?? 'default';
			for (const member of node.members) {
				const isMethod =
					ts.isMethodDeclaration(member) ||
					ts.isGetAccessorDeclaration(member) ||
					ts.isSetAccessorDeclaration(member);
				const isFunctionProperty =
					ts.isPropertyDeclaration(member) &&
					member.initializer &&
					(ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer));
				if (!isMethod && !isFunctionProperty) continue;
				const name = publicMemberName(member, sourceFile);
				if (name) methods.push(`${path}::${className}.${name}`);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return methods;
}

function collectBindingNames(name, names) {
	if (ts.isIdentifier(name)) names.push(name.text);
	else
		for (const element of name.elements) if (ts.isBindingElement(element)) collectBindingNames(element.name, names);
}

function addExport(exports, name, kind, binding) {
	if (!name) return;
	const kinds = exports.get(name) ?? new Map();
	const bindings = kinds.get(kind) ?? new Set();
	bindings.add(binding);
	kinds.set(kind, bindings);
	exports.set(name, kinds);
}

function addExportBindings(exports, name, kind, bindings) {
	for (const binding of bindings) addExport(exports, name, kind, binding);
}

function declarationBinding(path, name) {
	return `${path}::${name}`;
}

function declarationKinds(statement) {
	if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) return ['type'];
	if (ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) return ['runtime', 'type'];
	if (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isModuleDeclaration(statement)) {
		return ['runtime'];
	}
	return [];
}

function declarationNames(statement) {
	if (ts.isVariableStatement(statement)) {
		const names = [];
		for (const declaration of statement.declarationList.declarations) {
			collectBindingNames(declaration.name, names);
		}
		return names;
	}
	if (
		(ts.isFunctionDeclaration(statement) ||
			ts.isClassDeclaration(statement) ||
			ts.isInterfaceDeclaration(statement) ||
			ts.isTypeAliasDeclaration(statement) ||
			ts.isEnumDeclaration(statement) ||
			ts.isModuleDeclaration(statement)) &&
		statement.name
	) {
		return [statement.name.text];
	}
	return [];
}

function moduleInfo(path, source) {
	const direct = new Map();
	const locals = new Map();
	const imports = [];
	const reexports = [];
	const sourceFile = parseSource(path, source);
	for (const statement of sourceFile.statements) {
		const names = declarationNames(statement);
		const kinds = declarationKinds(statement);
		for (const name of names) {
			for (const kind of kinds) addExport(locals, name, kind, declarationBinding(path, name));
		}

		if (
			ts.isImportDeclaration(statement) &&
			ts.isStringLiteralLike(statement.moduleSpecifier) &&
			statement.importClause
		) {
			const specifier = statement.moduleSpecifier.text;
			const clause = statement.importClause;
			if (clause.name) {
				imports.push({
					kind: 'named',
					localName: clause.name.text,
					sourceName: 'default',
					specifier,
					typeOnly: clause.isTypeOnly
				});
			}
			if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
				imports.push({
					kind: 'namespace',
					localName: clause.namedBindings.name.text,
					specifier,
					typeOnly: clause.isTypeOnly
				});
			} else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
				for (const element of clause.namedBindings.elements) {
					imports.push({
						kind: 'named',
						localName: element.name.text,
						sourceName: element.propertyName?.text ?? element.name.text,
						specifier,
						typeOnly: clause.isTypeOnly || element.isTypeOnly
					});
				}
			}
			continue;
		}

		if (ts.isExportDeclaration(statement)) {
			const specifier =
				statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)
					? statement.moduleSpecifier.text
					: undefined;
			if (!statement.exportClause) {
				reexports.push({ kind: 'star', specifier, typeOnly: statement.isTypeOnly });
			} else if (ts.isNamespaceExport(statement.exportClause)) {
				reexports.push({
					kind: 'namespace',
					name: statement.exportClause.name.text,
					specifier,
					typeOnly: statement.isTypeOnly
				});
			} else {
				for (const element of statement.exportClause.elements) {
					reexports.push({
						kind: 'named',
						name: element.name.text,
						sourceName: element.propertyName?.text ?? element.name.text,
						specifier,
						typeOnly: statement.isTypeOnly || element.isTypeOnly
					});
				}
			}
			continue;
		}
		if (ts.isExportAssignment(statement)) {
			const name = statement.isExportEquals ? 'export=' : 'default';
			addExport(direct, name, 'runtime', declarationBinding(path, name));
			continue;
		}
		if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
		if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
			const bindingName = names[0] ?? 'default';
			for (const kind of kinds.length > 0 ? kinds : ['runtime']) {
				addExport(direct, 'default', kind, declarationBinding(path, bindingName));
			}
		} else {
			for (const name of names) {
				for (const kind of kinds) addExport(direct, name, kind, declarationBinding(path, name));
			}
		}
	}
	return { direct, imports, locals, reexports };
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.d.ts', '.mts', '.d.mts', '.cts', '.d.cts', '.js', '.jsx', '.mjs', '.cjs'];
const MODULE_EXTENSION_REPLACEMENTS = {
	'.cjs': ['.cts', '.d.cts', '.cjs'],
	'.cts': ['.cts', '.d.cts'],
	'.d.cts': ['.d.cts'],
	'.d.mts': ['.d.mts'],
	'.d.ts': ['.d.ts'],
	'.js': ['.ts', '.tsx', '.d.ts', '.js', '.jsx'],
	'.jsx': ['.tsx', '.d.ts', '.jsx'],
	'.mjs': ['.mts', '.d.mts', '.mjs'],
	'.mts': ['.mts', '.d.mts'],
	'.ts': ['.ts', '.tsx', '.d.ts'],
	'.tsx': ['.tsx', '.d.ts']
};

function resolveLocalModule(fromPath, specifier, files) {
	if (!specifier?.startsWith('.')) return undefined;
	const base = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
	const importedExtension = [...MODULE_EXTENSIONS]
		.sort((left, right) => right.length - left.length)
		.find((extension) => base.endsWith(extension));
	const root = importedExtension ? base.slice(0, -importedExtension.length) : base;
	const extensions = importedExtension
		? (MODULE_EXTENSION_REPLACEMENTS[importedExtension] ?? [importedExtension])
		: MODULE_EXTENSIONS;
	const candidates = importedExtension ? [] : [base];
	for (const extension of extensions) candidates.push(`${root}${extension}`);
	if (!importedExtension) {
		for (const extension of extensions) candidates.push(`${root}/index${extension}`);
	}
	return candidates.find((candidate) => files.has(candidate));
}

function addOrigin(target, name, origin) {
	const origins = target.get(name) ?? new Set();
	origins.add(origin);
	target.set(name, origins);
}

function addOrigins(target, name, origins) {
	for (const origin of origins ?? []) addOrigin(target, name, origin);
}

function copyOriginMap(source) {
	return new Map([...source].map(([name, origins]) => [name, new Set(origins)]));
}

function sameOriginMap(left, right) {
	if (left.size !== right.size) return false;
	for (const [name, origins] of left) {
		const other = right.get(name);
		if (!other || origins.size !== other.size || [...origins].some((origin) => !other.has(origin))) return false;
	}
	return true;
}

function serviceInstanceModuleInfo(path, source) {
	const seeds = new Map();
	const aliases = [];
	const imports = [];
	const directExports = [];
	const inlineExports = new Map();
	const reexports = [];
	const sourceFile = parseSource(path, source);
	for (const statement of sourceFile.statements) {
		if (
			ts.isImportDeclaration(statement) &&
			statement.importClause &&
			ts.isStringLiteralLike(statement.moduleSpecifier)
		) {
			const clause = statement.importClause;
			if (clause.isTypeOnly) continue;
			if (clause.name) {
				imports.push({
					localName: clause.name.text,
					sourceName: 'default',
					specifier: statement.moduleSpecifier.text
				});
			}
			if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
				for (const element of clause.namedBindings.elements) {
					if (!element.isTypeOnly) {
						imports.push({
							localName: element.name.text,
							sourceName: element.propertyName?.text ?? element.name.text,
							specifier: statement.moduleSpecifier.text
						});
					}
				}
			}
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
				const name = declaration.name.text;
				const initializer = unwrapExpression(declaration.initializer);
				if (ts.isNewExpression(initializer)) addOrigin(seeds, name, `${path}::${name}`);
				else if (ts.isIdentifier(initializer)) aliases.push({ localName: name, sourceName: initializer.text });
				if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
					directExports.push({ localName: name, outwardName: name });
				}
			}
			continue;
		}
		if (ts.isExportDeclaration(statement)) {
			const specifier =
				statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)
					? statement.moduleSpecifier.text
					: undefined;
			if (!statement.exportClause) {
				if (!statement.isTypeOnly && specifier) reexports.push({ kind: 'star', specifier });
			} else if (ts.isNamedExports(statement.exportClause)) {
				for (const element of statement.exportClause.elements) {
					if (statement.isTypeOnly || element.isTypeOnly) continue;
					const sourceName = element.propertyName?.text ?? element.name.text;
					if (specifier) {
						reexports.push({ kind: 'named', outwardName: element.name.text, sourceName, specifier });
					} else {
						directExports.push({ localName: sourceName, outwardName: element.name.text });
					}
				}
			}
			continue;
		}
		if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
			const expression = unwrapExpression(statement.expression);
			if (ts.isIdentifier(expression)) directExports.push({ localName: expression.text, outwardName: 'default' });
			else if (ts.isNewExpression(expression)) addOrigin(inlineExports, 'default', `${path}::default`);
		}
	}
	return { aliases, directExports, imports, inlineExports, reexports, seeds };
}

function collectServiceInstanceExports(files) {
	const paths = [...files.keys()].filter(
		(path) =>
			SOURCE_FILE.test(path) &&
			WEB_SURFACE_FILE.test(path) &&
			SERVICE_FILE.test(path) &&
			API_SERVICE_FILE.test(path)
	);
	const infos = new Map(paths.map((path) => [path, serviceInstanceModuleInfo(path, files.get(path))]));
	let resolved = new Map(paths.map((path) => [path, new Map()]));
	let changed = true;
	while (changed) {
		changed = false;
		const next = new Map();
		for (const path of paths) {
			const info = infos.get(path);
			const locals = copyOriginMap(info.seeds);
			for (const imported of info.imports) {
				const targetPath = resolveLocalModule(path, imported.specifier, files);
				addOrigins(locals, imported.localName, resolved.get(targetPath)?.get(imported.sourceName));
			}
			let aliasChanged = true;
			while (aliasChanged) {
				aliasChanged = false;
				for (const alias of info.aliases) {
					const before = locals.get(alias.localName)?.size ?? 0;
					addOrigins(locals, alias.localName, locals.get(alias.sourceName));
					if ((locals.get(alias.localName)?.size ?? 0) !== before) aliasChanged = true;
				}
			}
			const outward = copyOriginMap(info.inlineExports);
			for (const exported of info.directExports) {
				addOrigins(outward, exported.outwardName, locals.get(exported.localName));
			}
			for (const reexported of info.reexports) {
				const targetPath = resolveLocalModule(path, reexported.specifier, files);
				const target = resolved.get(targetPath);
				if (reexported.kind === 'star') {
					for (const [name, origins] of target ?? []) {
						if (name !== 'default') addOrigins(outward, name, origins);
					}
				} else {
					addOrigins(outward, reexported.outwardName, target?.get(reexported.sourceName));
				}
			}
			next.set(path, outward);
			if (!sameOriginMap(outward, resolved.get(path))) changed = true;
		}
		resolved = next;
	}
	const identities = [];
	for (const path of paths) {
		for (const [outwardName, origins] of resolved.get(path)) {
			identities.push(`${path}::${outwardName}`);
			for (const origin of origins) identities.push(`${path}::${outwardName}=>${origin}`);
		}
	}
	return identities;
}

function copyExports(source) {
	const copy = new Map();
	for (const [name, kinds] of source) {
		copy.set(name, new Map([...kinds].map(([kind, bindings]) => [kind, new Set(bindings)])));
	}
	return copy;
}

function sameExports(left, right) {
	if (left.size !== right.size) return false;
	for (const [name, kinds] of left) {
		const otherKinds = right.get(name);
		if (!otherKinds || kinds.size !== otherKinds.size) return false;
		for (const [kind, bindings] of kinds) {
			const otherBindings = otherKinds.get(kind);
			if (
				!otherBindings ||
				bindings.size !== otherBindings.size ||
				[...bindings].some((binding) => !otherBindings.has(binding))
			) {
				return false;
			}
		}
	}
	return true;
}

function exportOrigins(kinds) {
	const origins = new Set();
	for (const bindings of kinds?.values() ?? []) for (const binding of bindings) origins.add(binding);
	return origins;
}

function addResolvedImport(locals, imported, path, resolved, files) {
	const targetPath = resolveLocalModule(path, imported.specifier, files);
	if (imported.kind === 'namespace') {
		const kind = imported.typeOnly ? 'type' : 'runtime';
		addExport(
			locals,
			imported.localName,
			kind,
			targetPath ? `${targetPath}::*namespace*` : `${imported.specifier}::*namespace*`
		);
		return;
	}
	const targetKinds = targetPath ? resolved.get(targetPath)?.get(imported.sourceName) : undefined;
	if (targetKinds && exportOrigins(targetKinds).size === 1) {
		if (imported.typeOnly) {
			const bindings = targetKinds.get('type');
			if (bindings) addExportBindings(locals, imported.localName, 'type', bindings);
		} else {
			for (const [kind, bindings] of targetKinds) addExportBindings(locals, imported.localName, kind, bindings);
		}
	} else if (!targetPath) {
		const kind = imported.typeOnly ? 'type' : 'runtime';
		addExport(locals, imported.localName, kind, `${imported.specifier}::${imported.sourceName}`);
	}
}

function collectPublicExports(files) {
	const barrelPaths = [...files.keys()].filter(
		(path) => SOURCE_FILE.test(path) && WEB_SURFACE_FILE.test(path) && BARREL_FILE.test(path)
	);
	const infos = new Map();
	const pending = [...barrelPaths];
	while (pending.length > 0) {
		const path = pending.pop();
		if (infos.has(path)) continue;
		const source = files.get(path);
		if (source === undefined) continue;
		const info = moduleInfo(path, source);
		infos.set(path, info);
		for (const reference of [...info.imports, ...info.reexports]) {
			const target = resolveLocalModule(path, reference.specifier, files);
			if (target && !infos.has(target)) pending.push(target);
		}
	}

	let resolved = new Map([...infos].map(([path, info]) => [path, copyExports(info.direct)]));
	for (let iteration = 0; iteration <= infos.size; iteration += 1) {
		let changed = false;
		const next = new Map();
		for (const [path, info] of infos) {
			const exports = copyExports(info.direct);
			const locals = copyExports(info.locals);
			for (const imported of info.imports) addResolvedImport(locals, imported, path, resolved, files);
			const explicitNames = new Set([
				...info.direct.keys(),
				...info.reexports.filter(({ kind }) => kind !== 'star').map(({ name }) => name)
			]);
			for (const reexport of info.reexports.filter(({ kind }) => kind !== 'star')) {
				if (reexport.kind === 'namespace') {
					const kind = reexport.typeOnly ? 'type' : 'runtime';
					addExport(
						exports,
						reexport.name,
						kind,
						`${path}::namespace:${reexport.specifier ?? ''}:${reexport.name}::${kind}`
					);
					continue;
				}
				const targetPath = resolveLocalModule(path, reexport.specifier, files);
				const targetExports = targetPath ? resolved.get(targetPath) : undefined;
				const sourceExports = targetExports ?? (reexport.specifier ? new Map() : locals);
				const kinds = sourceExports.get(reexport.sourceName);
				if (reexport.typeOnly) {
					const bindings = kinds?.get('type');
					if (bindings && exportOrigins(kinds).size === 1) {
						addExportBindings(exports, reexport.name, 'type', bindings);
					} else if (!targetPath && reexport.specifier && !reexport.specifier.startsWith('.')) {
						addExport(
							exports,
							reexport.name,
							'type',
							`${reexport.specifier}::${reexport.sourceName}::type`
						);
					}
				} else if (kinds && exportOrigins(kinds).size === 1) {
					for (const [kind, bindings] of kinds) {
						addExportBindings(exports, reexport.name, kind, bindings);
					}
				} else if (!targetPath && reexport.specifier && !reexport.specifier.startsWith('.')) {
					addExport(
						exports,
						reexport.name,
						'runtime',
						`${reexport.specifier}::${reexport.sourceName}::runtime`
					);
				}
			}
			for (const name of explicitNames) {
				const kinds = exports.get(name);
				if (exportOrigins(kinds).size > 1) {
					const origin = `${path}::explicit:${name}`;
					for (const kind of kinds.keys()) kinds.set(kind, new Set([origin]));
				}
			}
			for (const reexport of info.reexports.filter(({ kind }) => kind === 'star')) {
				const targetPath = resolveLocalModule(path, reexport.specifier, files);
				const targetExports = targetPath ? resolved.get(targetPath) : undefined;
				if (!targetExports) {
					if (reexport.specifier && !reexport.specifier.startsWith('.')) {
						const kind = reexport.typeOnly ? 'type' : 'runtime';
						const name = `* from ${reexport.specifier}`;
						addExport(exports, name, kind, `${reexport.specifier}::*::${kind}`);
					}
					continue;
				}
				for (const [name, kinds] of targetExports) {
					if (
						name === 'default' ||
						name === 'export=' ||
						explicitNames.has(name) ||
						exportOrigins(kinds).size !== 1
					) {
						continue;
					}
					if (reexport.typeOnly) {
						const bindings = kinds.get('type');
						if (bindings) addExportBindings(exports, name, 'type', bindings);
					} else {
						for (const [kind, bindings] of kinds) addExportBindings(exports, name, kind, bindings);
					}
				}
			}
			next.set(path, exports);
			if (!sameExports(exports, resolved.get(path) ?? new Map())) changed = true;
		}
		resolved = next;
		if (!changed) break;
	}

	const exports = [];
	for (const path of barrelPaths) {
		for (const [name, kinds] of resolved.get(path) ?? []) {
			if (exportOrigins(kinds).size !== 1) continue;
			for (const kind of kinds.keys()) exports.push(`${path}::${kind}::${name}`);
		}
	}
	return exports;
}

const TEST_ROOT = /^(?:describe|it|test|xdescribe|xit|xtest|fdescribe|fit|ftest)$/;

function testChain(expression, aliases = new Map()) {
	if (ts.isParenthesizedExpression(expression)) return testChain(expression.expression, aliases);
	if (ts.isCallExpression(expression)) return testChain(expression.expression, aliases);
	if (ts.isTaggedTemplateExpression(expression)) return testChain(expression.tag, aliases);
	if (ts.isPropertyAccessExpression(expression)) {
		const parent = testChain(expression.expression, aliases);
		return parent ? [...parent, expression.name.text] : undefined;
	}
	if (ts.isElementAccessExpression(expression) && expression.argumentExpression) {
		const parent = testChain(expression.expression, aliases);
		const member = ts.isStringLiteralLike(expression.argumentExpression)
			? expression.argumentExpression.text
			: undefined;
		return parent && member ? [...parent, member] : undefined;
	}
	if (ts.isIdentifier(expression)) {
		if (aliases.has(expression.text)) return [...aliases.get(expression.text)];
		if (TEST_ROOT.test(expression.text)) return [expression.text];
	}
	return undefined;
}

function testTitle(node, sourceFile) {
	if (ts.isStringLiteralLike(node)) return node.text;
	if (ts.isTemplateExpression(node)) return node.getText(sourceFile).slice(1, -1);
	return undefined;
}

function collectTests(path, source) {
	const names = [];
	const markers = [];
	const nameCounts = new Map();
	const markerCounts = new Map();
	const sourceFile = parseSource(path, source);
	const aliases = new Map();
	for (const statement of sourceFile.statements) {
		if (
			ts.isImportDeclaration(statement) &&
			ts.isStringLiteralLike(statement.moduleSpecifier) &&
			statement.moduleSpecifier.text === '@jest/globals' &&
			statement.importClause?.namedBindings
		) {
			const bindings = statement.importClause.namedBindings;
			if (ts.isNamespaceImport(bindings)) aliases.set(bindings.name.text, []);
			else {
				for (const element of bindings.elements) {
					const imported = element.propertyName?.text ?? element.name.text;
					if (TEST_ROOT.test(imported)) aliases.set(element.name.text, [imported]);
				}
			}
		}
	}
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
			const chain = testChain(declaration.initializer, aliases);
			if (chain?.length && TEST_ROOT.test(chain[0])) aliases.set(declaration.name.text, chain);
		}
	}
	const visit = (node) => {
		if (ts.isCallExpression(node) && node.arguments.length > 0) {
			const chain = testChain(node.expression, aliases);
			const title = testTitle(node.arguments[0], sourceFile);
			if (chain && TEST_ROOT.test(chain[0]) && title) {
				const nameKey = `${path}::${title}`;
				const nameOrdinal = (nameCounts.get(nameKey) ?? 0) + 1;
				nameCounts.set(nameKey, nameOrdinal);
				names.push(`${nameKey}::#${nameOrdinal}`);
				const root = chain[0];
				const marked =
					/^[xf](?:describe|it|test)$/.test(root) || chain.some((part) => /^(?:skip|only|todo)$/.test(part));
				if (marked) {
					const markerKey = `${path}::${chain.join('.')}::${title}`;
					const markerOrdinal = (markerCounts.get(markerKey) ?? 0) + 1;
					markerCounts.set(markerKey, markerOrdinal);
					markers.push(`${markerKey}::#${markerOrdinal}`);
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return { markers, names };
}

function propertyName(property) {
	return property.name && (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
		? property.name.text
		: undefined;
}

const UNRESOLVED = Symbol('unresolved');
const UNRESOLVED_EXPRESSION = Symbol('unresolved-expression');
const UNRESOLVED_SPREADS = Symbol('unresolved-spreads');
const TEST_SELECTION_KEYS = new Set([
	'changedSince',
	'findRelatedTests',
	'onlyChanged',
	'roots',
	'testFile',
	'testMatch',
	'testNamePattern',
	'testNamePatterns',
	'testPathPattern',
	'testPathPatterns',
	'testRegex',
	'watch'
]);
const NEUTRAL_FALSE_SELECTION_KEYS = new Set(['onlyChanged', 'watch']);
const TRUSTED_PASSTHROUGH_FACTORY_MODULES = new Set(['next/jest', 'next/jest.js']);
const CONFIG_MUTATION_METHODS = new Set([
	'copyWithin',
	'fill',
	'pop',
	'push',
	'reverse',
	'shift',
	'sort',
	'splice',
	'unshift'
]);

function unwrapExpression(node) {
	while (
		node &&
		(ts.isAsExpression(node) ||
			ts.isSatisfiesExpression(node) ||
			ts.isParenthesizedExpression(node) ||
			ts.isNonNullExpression(node) ||
			ts.isTypeAssertionExpression(node))
	) {
		node = node.expression;
	}
	return node;
}

function accessPropertyName(expression) {
	if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
	if (
		ts.isElementAccessExpression(expression) &&
		expression.argumentExpression &&
		(ts.isStringLiteralLike(expression.argumentExpression) || ts.isNumericLiteral(expression.argumentExpression))
	) {
		return expression.argumentExpression.text;
	}
	return undefined;
}

function expressionAccessSegments(node) {
	node = unwrapExpression(node);
	if (!node) return undefined;
	if (ts.isIdentifier(node)) return [node.text];
	if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
		return ['import', node.name.text];
	}
	if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
		const parent = expressionAccessSegments(node.expression);
		const name = accessPropertyName(node);
		return parent && name ? [...parent, name] : undefined;
	}
	return undefined;
}

function unresolvedExpression(node) {
	return { [UNRESOLVED_EXPRESSION]: node?.getText() ?? '<unknown expression>' };
}

function unresolvedExpressionText(value) {
	return value && typeof value === 'object' && !Array.isArray(value) ? value[UNRESOLVED_EXPRESSION] : undefined;
}

function isUnresolvedValue(value) {
	return value === UNRESOLVED || unresolvedExpressionText(value) !== undefined;
}

function isStaticObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value) && !isUnresolvedValue(value);
}

function staticValue(node, values, context = {}, seen = new Set()) {
	node = unwrapExpression(node);
	if (!node) return UNRESOLVED;
	if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
	if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
	if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (node.kind === ts.SyntaxKind.NullKeyword) return null;
	if (ts.isIdentifier(node)) {
		if (seen.has(node.text) || !values.has(node.text)) return UNRESOLVED;
		seen.add(node.text);
		const value = values.get(node.text);
		seen.delete(node.text);
		return value;
	}
	if (ts.isArrayLiteralExpression(node)) {
		const result = [];
		for (const element of node.elements) {
			if (ts.isSpreadElement(element)) {
				const spread = staticValue(element.expression, values, context, seen);
				if (!Array.isArray(spread)) return UNRESOLVED;
				result.push(...spread);
			} else {
				result.push(staticValue(element, values, context, seen));
			}
		}
		return result;
	}
	if (ts.isObjectLiteralExpression(node)) {
		const result = {};
		for (const property of node.properties) {
			if (ts.isSpreadAssignment(property)) {
				const spread = staticValue(property.expression, values, context, seen);
				if (isStaticObject(spread)) Object.assign(result, spread);
				else {
					result[UNRESOLVED_SPREADS] = [...(result[UNRESOLVED_SPREADS] ?? []), property.getText()];
				}
				continue;
			}
			const name = propertyName(property);
			if (!name) continue;
			if (ts.isPropertyAssignment(property)) {
				result[name] = staticValue(property.initializer, values, context, seen);
			} else if (ts.isShorthandPropertyAssignment(property)) {
				result[name] = values.get(property.name.text) ?? UNRESOLVED;
			}
		}
		return result;
	}
	if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
		const name = accessPropertyName(node);
		const parent = staticValue(node.expression, values, context, seen);
		return name && isStaticObject(parent) ? (parent[name] ?? UNRESOLVED) : unresolvedExpression(node);
	}
	if (ts.isCallExpression(node)) {
		if (expressionAccessSegments(node.expression)?.join('.') === 'Object.assign') {
			const evaluated = node.arguments.map((argument) => staticValue(argument, values, context, seen));
			const [target, ...sources] = evaluated;
			if (!isStaticObject(target) || sources.some((source) => !isStaticObject(source))) {
				return unresolvedExpression(node);
			}
			Object.assign(target, ...sources);
			return target;
		}
		const callee = unwrapExpression(node.expression);
		if (node.arguments.length > 0 && ts.isIdentifier(callee) && context.passthroughCalls?.has(callee.text)) {
			return staticValue(node.arguments[0], values, context, seen);
		}
		return unresolvedExpression(node);
	}
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		const left = staticValue(node.left, values, context, seen);
		const right = staticValue(node.right, values, context, seen);
		if (!isUnresolvedValue(left) && !isUnresolvedValue(right)) return String(left) + String(right);
	}
	return UNRESOLVED;
}

function flattenedValues(value) {
	if (value === UNRESOLVED) return ['<unresolved>'];
	const expression = unresolvedExpressionText(value);
	if (expression !== undefined) return [`<unresolved:${expression}>`];
	if (Array.isArray(value)) return value.flatMap(flattenedValues);
	if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return [String(value)];
	return ['<unresolved>'];
}

function selectionValues(name, value) {
	return NEUTRAL_FALSE_SELECTION_KEYS.has(name) && value === false ? [] : flattenedValues(value);
}

function recordConfigOptions(path, options, prefix, configuration, exclusions) {
	if (!options || typeof options !== 'object' || Array.isArray(options)) return;
	for (const [name, value] of Object.entries(options)) {
		if (NEUTRAL_FALSE_SELECTION_KEYS.has(name)) {
			if (value === true) exclusions.push(`${path}::${prefix}${name}=true`);
		} else if (TEST_SELECTION_KEYS.has(name)) {
			for (const item of selectionValues(name, value)) configuration.push(`${path}::${prefix}${name}=${item}`);
		} else if (/ignore|exclude/i.test(name)) {
			for (const item of flattenedValues(value)) exclusions.push(`${path}::${prefix}${name}=${item}`);
		} else if (name === 'passWithNoTests') {
			if (value === true) exclusions.push(`${path}::${prefix}${name}=true`);
		}
	}
	for (const spread of options[UNRESOLVED_SPREADS] ?? []) {
		exclusions.push(`${path}::${prefix}<unresolvedSpread>=${spread}`);
	}
	for (const [name, value] of Object.entries(options)) {
		if (Array.isArray(value)) {
			value.forEach((item, index) => {
				if (isStaticObject(item)) {
					recordConfigOptions(path, item, `${prefix}${name}[${index}].`, configuration, exclusions);
				}
			});
		} else if (isStaticObject(value)) {
			recordConfigOptions(path, value, `${prefix}${name}.`, configuration, exclusions);
		}
	}
}

function assignStaticProperty(expression, value, values) {
	const name = accessPropertyName(expression);
	const root = expression.expression;
	if (!name || !ts.isIdentifier(root)) return;
	const target = values.get(root.text);
	if (isStaticObject(target)) target[name] = value;
}

function requiredModuleSpecifier(node) {
	node = unwrapExpression(node);
	return ts.isCallExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === 'require' &&
		node.arguments.length === 1 &&
		ts.isStringLiteralLike(node.arguments[0])
		? node.arguments[0].text
		: undefined;
}

function trustedFactoryModule(node) {
	node = unwrapExpression(node);
	const required = requiredModuleSpecifier(node);
	if (required) return required;
	if (
		(ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
		accessPropertyName(node) === 'default'
	) {
		return requiredModuleSpecifier(node.expression);
	}
	return undefined;
}

function collectTrustedFactoryBindings(sourceFile) {
	const bindings = new Set();
	for (const statement of sourceFile.statements) {
		if (
			ts.isImportDeclaration(statement) &&
			ts.isStringLiteralLike(statement.moduleSpecifier) &&
			TRUSTED_PASSTHROUGH_FACTORY_MODULES.has(statement.moduleSpecifier.text) &&
			statement.importClause?.name
		) {
			bindings.add(statement.importClause.name.text);
		}
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (
				ts.isIdentifier(declaration.name) &&
				declaration.initializer &&
				TRUSTED_PASSTHROUGH_FACTORY_MODULES.has(trustedFactoryModule(declaration.initializer))
			) {
				bindings.add(declaration.name.text);
			}
		}
	}
	return bindings;
}

function isTrustedFactoryInvocation(node, trustedFactoryBindings) {
	node = unwrapExpression(node);
	if (!ts.isCallExpression(node)) return false;
	const callee = unwrapExpression(node.expression);
	return (
		(ts.isIdentifier(callee) && trustedFactoryBindings.has(callee.text)) ||
		TRUSTED_PASSTHROUGH_FACTORY_MODULES.has(trustedFactoryModule(callee))
	);
}

function sourceDigest(source) {
	return createHash('sha256').update(source).digest('hex');
}

function referencedLocalNames(node, declarations) {
	const names = new Set();
	const visit = (current) => {
		if (ts.isIdentifier(current) && declarations.has(current.text)) names.add(current.text);
		ts.forEachChild(current, visit);
	};
	if (node) visit(node);
	return names;
}

function exportedConfigRoots(exportNode, declarations) {
	const roots = referencedLocalNames(exportNode, declarations);
	const pending = [...roots];
	while (pending.length > 0) {
		const name = pending.pop();
		for (const referenced of referencedLocalNames(declarations.get(name), declarations)) {
			if (roots.has(referenced)) continue;
			roots.add(referenced);
			pending.push(referenced);
		}
	}
	return roots;
}

function configGraphDigest(node, declarations, sourceFile) {
	const roots = exportedConfigRoots(node, declarations);
	const graph = [node?.getText(sourceFile) ?? '<unresolved>'];
	for (const name of [...roots].sort(compareCodePoints)) {
		graph.push(`${name}=${declarations.get(name)?.getText(sourceFile) ?? '<missing>'}`);
	}
	return sourceDigest(graph.join('\n'));
}

function mutationGraphDigest(node, sourceFile, declarations) {
	const dependencies = [];
	const context = [];
	if (ts.isCallExpression(node)) dependencies.push(...node.arguments);
	else if (ts.isBinaryExpression(node)) dependencies.push(node.right);
	let current = node;
	const functionNames = new Set();
	while (current.parent && !ts.isSourceFile(current.parent)) {
		const parent = current.parent;
		if (ts.isIfStatement(parent)) {
			context.push(
				`if:${parent.expression.getText(sourceFile)}:${current === parent.elseStatement ? 'else' : 'then'}`
			);
			dependencies.push(parent.expression);
		} else if (ts.isConditionalExpression(parent)) {
			context.push(
				`conditional:${parent.condition.getText(sourceFile)}:${current === parent.whenFalse ? 'false' : 'true'}`
			);
			dependencies.push(parent.condition);
		} else if (
			ts.isWhileStatement(parent) ||
			ts.isDoStatement(parent) ||
			ts.isForInStatement(parent) ||
			ts.isForOfStatement(parent)
		) {
			const expression = parent.expression;
			context.push(`loop:${expression.getText(sourceFile)}`);
			dependencies.push(expression);
		} else if (ts.isForStatement(parent) && parent.condition) {
			context.push(`for:${parent.condition.getText(sourceFile)}`);
			dependencies.push(parent.condition);
		} else if (ts.isFunctionDeclaration(parent) && parent.name) {
			functionNames.add(parent.name.text);
			context.push(
				`function:${parent.name.text}(${parent.parameters.map((parameter) => parameter.getText(sourceFile)).join(',')})`
			);
		} else if (
			(ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) &&
			ts.isVariableDeclaration(parent.parent) &&
			ts.isIdentifier(parent.parent.name)
		) {
			functionNames.add(parent.parent.name.text);
			context.push(
				`function:${parent.parent.name.text}(${parent.parameters.map((parameter) => parameter.getText(sourceFile)).join(',')})`
			);
		}
		current = parent;
	}
	if (functionNames.size > 0) {
		const visitCalls = (candidate) => {
			if (
				ts.isCallExpression(candidate) &&
				ts.isIdentifier(candidate.expression) &&
				functionNames.has(candidate.expression.text)
			) {
				dependencies.push(candidate);
			}
			ts.forEachChild(candidate, visitCalls);
		};
		visitCalls(sourceFile);
	}
	const names = new Set();
	for (const dependency of dependencies) {
		for (const name of exportedConfigRoots(dependency, declarations)) names.add(name);
	}
	const graph = [node.getText(sourceFile), ...context];
	for (const name of [...names].sort(compareCodePoints)) {
		graph.push(`${name}=${declarations.get(name)?.getText(sourceFile) ?? '<missing>'}`);
	}
	return sourceDigest(graph.join('\n'));
}

function collectConfigMutationTokens(path, sourceFile, roots, values, staticContext, declarations) {
	const tokens = [];
	const isRelevantSelectionPath = (segments) => {
		if (!segments) return false;
		const isRelevantRoot =
			roots.has(segments[0]) || segments.slice(0, 2).join('.') === 'module.exports' || segments[0] === 'exports';
		return (
			isRelevantRoot &&
			segments.some(
				(segment) =>
					TEST_SELECTION_KEYS.has(segment) || segment === 'passWithNoTests' || /ignore|exclude/i.test(segment)
			)
		);
	};
	const visit = (node) => {
		if (ts.isCallExpression(node)) {
			const segments = expressionAccessSegments(node.expression);
			const method = segments?.at(-1);
			const configPath = segments?.slice(0, -1) ?? [];
			if (method && CONFIG_MUTATION_METHODS.has(method) && isRelevantSelectionPath(configPath)) {
				const digest = mutationGraphDigest(node, sourceFile, declarations);
				tokens.push(`${path}::<configMutation>=${node.getText(sourceFile)}::source=${digest}`);
			}
		} else if (ts.isBinaryExpression(node)) {
			const segments = expressionAccessSegments(node.left);
			const option = segments?.at(-1);
			const isAssignment =
				node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
			const isNeutralFalse =
				(NEUTRAL_FALSE_SELECTION_KEYS.has(option) || option === 'passWithNoTests') &&
				staticValue(node.right, values, staticContext) === false;
			if (isAssignment && !isNeutralFalse && isRelevantSelectionPath(segments)) {
				const digest = mutationGraphDigest(node, sourceFile, declarations);
				tokens.push(`${path}::<configMutation>=${node.getText(sourceFile)}::source=${digest}`);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return tokens;
}

function collectJestConfig(path, source, configuration, exclusions) {
	const sourceFile = parseSource(path, source);
	const values = new Map();
	const declarations = new Map();
	const trustedFactoryBindings = collectTrustedFactoryBindings(sourceFile);
	const passthroughCalls = new Set();
	const staticContext = { passthroughCalls };
	let esmExport = UNRESOLVED;
	let esmExportNode;
	let hasEsmExport = false;
	let moduleExports = {};
	const exportsAlias = moduleExports;
	let commonJsExportNode;
	let hasCommonJsExport = false;
	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) {
			declarations.set(statement.name.text, statement);
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name) && declaration.initializer) {
					declarations.set(declaration.name.text, declaration.initializer);
					if (isTrustedFactoryInvocation(declaration.initializer, trustedFactoryBindings)) {
						passthroughCalls.add(declaration.name.text);
					}
					values.set(declaration.name.text, staticValue(declaration.initializer, values, staticContext));
				}
			}
			continue;
		}
		if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
			const assignment = statement.expression;
			if (assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
				const value = staticValue(assignment.right, values, staticContext);
				const segments = expressionAccessSegments(assignment.left);
				if (segments?.join('.') === 'module.exports') {
					moduleExports = value;
					commonJsExportNode = assignment.right;
					hasCommonJsExport = true;
				} else if (segments?.slice(0, 2).join('.') === 'module.exports' && segments.length === 3) {
					if (moduleExports && typeof moduleExports === 'object' && !Array.isArray(moduleExports)) {
						moduleExports[segments[2]] = value;
					}
					hasCommonJsExport = true;
				} else if (segments?.[0] === 'exports' && segments.length === 2) {
					exportsAlias[segments[1]] = value;
					hasCommonJsExport = true;
				} else {
					assignStaticProperty(assignment.left, value, values);
				}
			}
			continue;
		}
		if (
			ts.isExpressionStatement(statement) &&
			ts.isCallExpression(statement.expression) &&
			statement.expression.expression.getText(sourceFile) === 'Object.assign'
		) {
			const [targetNode, ...sourceNodes] = statement.expression.arguments;
			if (targetNode) {
				const targetSegments = expressionAccessSegments(targetNode);
				let target;
				if (targetSegments?.join('.') === 'module.exports') {
					target = moduleExports;
					hasCommonJsExport = true;
				} else if (targetSegments?.join('.') === 'exports') {
					target = exportsAlias;
					hasCommonJsExport = true;
				} else if (ts.isIdentifier(targetNode)) {
					target = values.get(targetNode.text);
				}
				if (isStaticObject(target)) {
					for (const sourceNode of sourceNodes) {
						const sourceValue = staticValue(sourceNode, values, staticContext);
						if (isStaticObject(sourceValue)) {
							Object.assign(target, sourceValue);
						} else {
							target[UNRESOLVED_SPREADS] = [
								...(target[UNRESOLVED_SPREADS] ?? []),
								`Object.assign source ${sourceNode.getText()}`
							];
						}
					}
				}
			}
			continue;
		}
		if (ts.isExportAssignment(statement)) {
			esmExport = staticValue(statement.expression, values, staticContext);
			esmExportNode = statement.expression;
			hasEsmExport = true;
		}
	}
	const selectedExportNode = hasEsmExport ? esmExportNode : commonJsExportNode;
	const roots = exportedConfigRoots(selectedExportNode, declarations);
	exclusions.push(...collectConfigMutationTokens(path, sourceFile, roots, values, staticContext, declarations));
	const config = hasEsmExport ? esmExport : hasCommonJsExport ? moduleExports : UNRESOLVED;
	const unresolvedConfig = unresolvedExpressionText(config);
	if (unresolvedConfig !== undefined) {
		const suffix =
			roots.size > 0 ? `::source=${configGraphDigest(selectedExportNode, declarations, sourceFile)}` : '';
		exclusions.push(`${path}::<unresolvedConfig>=${unresolvedConfig}${suffix}`);
	} else if (isStaticObject(config)) {
		recordConfigOptions(path, config, '', configuration, exclusions);
	} else {
		const expression = selectedExportNode?.getText(sourceFile) ?? '<unresolved>';
		const digest =
			roots.size > 0 ? configGraphDigest(selectedExportNode, declarations, sourceFile) : sourceDigest(source);
		exclusions.push(`${path}::<unresolvedConfig>=${expression}::source=${digest}`);
	}
}

function collectJsonTarget(path, target, prefix, trackedPaths, configuration, exclusions) {
	if (!target || typeof target !== 'object' || Array.isArray(target)) return;
	if (typeof target.executor === 'string') configuration.push(`${path}::${prefix}.executor=${target.executor}`);
	for (const [name, value] of Object.entries(target.options ?? {})) {
		const key = `${prefix}.options.${name}`;
		if (name === 'jestConfig') {
			if (trackedPaths.has(String(value).replaceAll('\\', '/'))) {
				configuration.push(`${path}::${key}=${String(value)}`);
			}
		} else if (name === 'config') {
			configuration.push(`${path}::${key}=${String(value)}`);
		} else if (NEUTRAL_FALSE_SELECTION_KEYS.has(name)) {
			if (value === true) exclusions.push(`${path}::${key}=true`);
		} else if (TEST_SELECTION_KEYS.has(name)) {
			for (const item of selectionValues(name, value)) configuration.push(`${path}::${key}=${item}`);
		} else if (/ignore|exclude/i.test(name)) {
			for (const item of flattenedValues(value)) exclusions.push(`${path}::${key}=${item}`);
		} else if (name === 'passWithNoTests') {
			if (value === true) exclusions.push(`${path}::${key}=true`);
		}
	}
	for (const [name, value] of Object.entries(target.configurations ?? {})) {
		collectJsonTarget(path, value, `${prefix}.configurations.${name}`, trackedPaths, configuration, exclusions);
	}
}

function isJestTarget(name, target) {
	return (
		/(?:test|jest)/i.test(name) ||
		/jest/i.test(String(target?.executor ?? '')) ||
		Object.hasOwn(target?.options ?? {}, 'jestConfig')
	);
}

function collectTargetMap(path, targets, prefix, trackedPaths, configuration, exclusions) {
	for (const [name, target] of Object.entries(targets ?? {})) {
		if (isJestTarget(name, target)) {
			collectJsonTarget(path, target, `${prefix}${name}`, trackedPaths, configuration, exclusions);
		}
	}
}

function collectTestConfiguration(path, source, trackedPaths) {
	const configuration = [];
	const exclusions = [];
	if (/(?:^|\/)(?:(?:project|workspace|nx)\.json|package\.json)$/.test(path)) {
		let root;
		try {
			root = JSON.parse(source);
		} catch (error) {
			throw new Error(`Unable to parse test configuration ${path}: ${error.message}`);
		}
		if (root?.jest && typeof root.jest === 'object' && !Array.isArray(root.jest)) {
			recordConfigOptions(path, root.jest, 'jest.', configuration, exclusions);
		}
		collectTargetMap(path, root?.targets, 'targets.', trackedPaths, configuration, exclusions);
		for (const [projectName, project] of Object.entries(root?.projects ?? {})) {
			collectTargetMap(
				path,
				project?.targets,
				`projects.${projectName}.targets.`,
				trackedPaths,
				configuration,
				exclusions
			);
		}
		for (const [name, target] of Object.entries(root?.targetDefaults ?? {})) {
			if (isJestTarget(name, target)) {
				collectJsonTarget(path, target, `targetDefaults.${name}`, trackedPaths, configuration, exclusions);
			}
		}
	}
	if (/(?:^|\/)jest\.config\.[cm]?[jt]s$/.test(path)) {
		collectJestConfig(path, source, configuration, exclusions);
	}
	return { configuration, exclusions };
}

function isOverlayName(name) {
	return /(?:Modal|Dialog|Drawer)/.test(name);
}

function isOverlayComponentInitializer(initializer) {
	initializer = unwrapExpression(initializer);
	return (
		ts.isArrowFunction(initializer) ||
		ts.isFunctionExpression(initializer) ||
		ts.isClassExpression(initializer) ||
		ts.isCallExpression(initializer) ||
		ts.isIdentifier(initializer) ||
		ts.isPropertyAccessExpression(initializer) ||
		ts.isElementAccessExpression(initializer)
	);
}

function collectOverlayComponents(path, source) {
	const components = [];
	const overlayFile = /(?:Modal|Dialog|Drawer)/i.test(posix.basename(path));
	if (overlayFile) components.push(path);
	const sourceFile = parseSource(path, source);
	const runtimeBindings = new Set();
	for (const statement of sourceFile.statements) {
		if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isEnumDeclaration(statement)) &&
			statement.name
		) {
			runtimeBindings.add(statement.name.text);
		} else if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				const names = [];
				collectBindingNames(declaration.name, names);
				for (const name of names) runtimeBindings.add(name);
			}
		}
	}
	const addDeclaration = (name) => {
		if (name && isOverlayName(name)) components.push(`${path}::${name}`);
	};
	const addExport = (outwardName, localName = outwardName) => {
		if (outwardName === 'default') {
			if (overlayFile || isOverlayName(localName)) components.push(`${path}::export::default`);
		} else if (isOverlayName(outwardName) || isOverlayName(localName)) {
			components.push(`${path}::export::${outwardName}`);
		}
	};
	const visit = (node) => {
		if (ts.isVariableDeclaration(node) && node.initializer && isOverlayComponentInitializer(node.initializer)) {
			const names = [];
			collectBindingNames(node.name, names);
			for (const name of names) addDeclaration(name);
		} else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
			addDeclaration(node.name.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	for (const statement of sourceFile.statements) {
		if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.exportClause) {
			if (ts.isNamedExports(statement.exportClause)) {
				for (const element of statement.exportClause.elements) {
					if (element.isTypeOnly) continue;
					const localName = element.propertyName?.text ?? element.name.text;
					if (statement.moduleSpecifier || runtimeBindings.has(localName))
						addExport(element.name.text, localName);
				}
			} else if (ts.isNamespaceExport(statement.exportClause)) {
				addExport(statement.exportClause.name.text);
			}
			continue;
		}
		if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
			const expression = unwrapExpression(statement.expression);
			addExport('default', ts.isIdentifier(expression) ? expression.text : 'default');
			continue;
		}
		if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
		if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isEnumDeclaration(statement)) &&
			statement.name
		) {
			addExport(
				hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : statement.name.text,
				statement.name.text
			);
		} else if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				const names = [];
				collectBindingNames(declaration.name, names);
				for (const name of names) addExport(name);
			}
		}
	}
	return components;
}

function staticString(node, values = new Map()) {
	const value = staticValue(node, values);
	return typeof value === 'string' ? value : undefined;
}

function environmentAccessSegments(node) {
	return expressionAccessSegments(node);
}

function canonicalEnvironment(node, aliases) {
	node = unwrapExpression(node);
	if (ts.isIdentifier(node) && aliases.has(node.text)) return aliases.get(node.text);
	const segments = environmentAccessSegments(node)?.join('.');
	return segments === 'process.env' || segments === 'import.meta.env' ? segments : undefined;
}

function navigationCallName(expression) {
	const segments = expressionAccessSegments(expression);
	if (!segments) return undefined;
	if (segments.length === 1 && /^(?:redirect|permanentRedirect)$/.test(segments[0])) return segments[0];
	const method = segments.at(-1);
	const receiver = segments.at(-2);
	if (/^(?:push|replace)$/.test(method) && /^(?:router|navigation)$/i.test(receiver)) {
		return `${receiver.toLowerCase()}.${method}`;
	}
	if (/^(?:assign|replace)$/.test(method) && receiver === 'location') return `location.${method}`;
	return undefined;
}

function collectNavigationAndEnvironment(path, source) {
	const navigation = [];
	const nextPublicOccurrences = [];
	const sourceFile = parseSource(path, source);
	const values = new Map();
	const environmentAliases = new Map();
	const variableDeclarations = [];
	const collectVariables = (node) => {
		if (ts.isVariableDeclaration(node)) variableDeclarations.push(node);
		ts.forEachChild(node, collectVariables);
	};
	collectVariables(sourceFile);
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (ts.isIdentifier(declaration.name) && declaration.initializer) {
				values.set(declaration.name.text, staticValue(declaration.initializer, values));
			}
		}
	}
	for (let iteration = 0; iteration <= variableDeclarations.length; iteration += 1) {
		let changed = false;
		for (const declaration of variableDeclarations) {
			if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
			const environment = canonicalEnvironment(declaration.initializer, environmentAliases);
			if (environment && environmentAliases.get(declaration.name.text) !== environment) {
				environmentAliases.set(declaration.name.text, environment);
				changed = true;
			}
		}
		if (!changed) break;
	}
	const visit = (node) => {
		if (ts.isJsxAttribute(node) && node.name.text === 'href' && node.initializer) {
			const value = ts.isJsxExpression(node.initializer)
				? staticString(node.initializer.expression, values)
				: staticString(node.initializer, values);
			if (value !== undefined) navigation.push(`${path}::href=${value}`);
		} else if (
			(ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) &&
			propertyName(node) === 'href' &&
			node.initializer
		) {
			const value = staticString(node.initializer, values);
			if (value !== undefined) navigation.push(`${path}::href=${value}`);
		} else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
			if (/(?:ROUTE|PATH|URL)/.test(node.name.text)) {
				navigation.push(`${path}::constant=${node.name.text}`);
				const value = staticString(node.initializer, values);
				if (value !== undefined) navigation.push(`${path}::${node.name.text}=${value}`);
			}
		}
		if (ts.isCallExpression(node) && node.arguments.length > 0) {
			const name = navigationCallName(node.expression);
			if (name) {
				const value =
					staticString(node.arguments[0], values) ?? `<dynamic:${node.arguments[0].getText(sourceFile)}>`;
				navigation.push(`${path}::${name}=${value}`);
			}
		}
		if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
			const environment = canonicalEnvironment(node.initializer, environmentAliases);
			if (environment === 'process.env' || environment === 'import.meta.env') {
				for (const element of node.name.elements) {
					if (element.dotDotDotToken) continue;
					const selected = element.propertyName ?? element.name;
					if (
						(ts.isIdentifier(selected) || ts.isStringLiteralLike(selected)) &&
						selected.text.startsWith('NEXT_PUBLIC_')
					) {
						nextPublicOccurrences.push(`${path}::${selected.text}`);
					}
				}
			}
		}

		if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
			const name = accessPropertyName(node);
			const environment = canonicalEnvironment(node.expression, environmentAliases);
			if (name?.startsWith('NEXT_PUBLIC_') && environment) {
				nextPublicOccurrences.push(`${path}::${name}`);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return { navigation, nextPublicOccurrences };
}

export function collectSurface(ref, options = {}) {
	const cwd = resolve(options.cwd ?? process.cwd());
	const commit = runGit(cwd, ['rev-parse', `${ref}^{commit}`])
		.toString('utf8')
		.trim();
	const files = readGitTree(cwd, commit);
	const surface = {
		exclusions: [],
		navigation: [],
		nextPublicOccurrences: [],
		overlayComponents: [],
		publicExports: [],
		routes: [],
		serviceMethods: [],
		testConfiguration: [],
		testMarkers: [],
		testNames: []
	};
	surface.publicExports.push(...collectPublicExports(files));
	surface.serviceMethods.push(...collectServiceInstanceExports(files));

	for (const [path, source] of files) {
		surface.routes.push(...collectRoutes(path, source));
		if (SOURCE_FILE.test(path) && WEB_SURFACE_FILE.test(path)) {
			surface.overlayComponents.push(...collectOverlayComponents(path, source));
			const navigation = collectNavigationAndEnvironment(path, source);
			surface.navigation.push(...navigation.navigation);
			surface.nextPublicOccurrences.push(...navigation.nextPublicOccurrences);
			if (SERVICE_FILE.test(path) && API_SERVICE_FILE.test(path)) {
				surface.serviceMethods.push(...collectServiceMethods(path, source));
			}
		}
		if (SOURCE_FILE.test(path) && TEST_FILE.test(path)) {
			const tests = collectTests(path, source);
			surface.testNames.push(...tests.names);
			surface.testMarkers.push(...tests.markers);
		}
		if (!SOURCE_FILE.test(path)) {
			for (const match of source.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g)) {
				surface.nextPublicOccurrences.push(`${path}::${match[0]}`);
			}
		}
		const testConfiguration = collectTestConfiguration(path, source, files);
		surface.exclusions.push(...testConfiguration.exclusions);
		surface.testConfiguration.push(...testConfiguration.configuration);
	}

	surface.navigation = sortedOccurrences(surface.navigation);
	surface.nextPublicOccurrences = sortedOccurrences(surface.nextPublicOccurrences);
	for (const category of Object.keys(surface)) {
		if (category !== 'navigation' && category !== 'nextPublicOccurrences') {
			surface[category] = sorted(surface[category]);
		}
	}
	return { commit, ref, surface };
}

function normalizeAllow(allow) {
	if (!Array.isArray(allow)) throw new Error('Preservation allowlist must be a JSON array');
	return new Set(
		allow.map((entry) => {
			if (typeof entry === 'string') return entry;
			if (entry && typeof entry.id === 'string') return entry.id;
			throw new Error('Each preservation allow entry must be an id string or an object with an id');
		})
	);
}

export function compareSurface(base, head, allow = []) {
	const allowed = normalizeAllow(allow);
	const violations = [];
	const addViolation = (category, kind, value) => {
		const id = `${kind}:${category}:${value}`;
		if (!allowed.has(id)) violations.push({ category, kind, value });
	};
	for (const category of REMOVAL_CATEGORIES) {
		const headValues = new Set(head.surface[category] ?? []);
		for (const value of base.surface[category] ?? []) {
			if (!headValues.has(value)) addViolation(category, 'removed', value);
		}
	}
	for (const category of ['testMarkers', 'exclusions']) {
		const baseValues = new Set(base.surface[category] ?? []);
		for (const value of head.surface[category] ?? []) {
			if (!baseValues.has(value)) addViolation(category, 'added', value);
		}
	}
	const baseConfiguration = new Set(base.surface.testConfiguration ?? []);
	for (const value of head.surface.testConfiguration ?? []) {
		if (
			!baseConfiguration.has(value) &&
			/::.*(?:changedSince|config|findRelatedTests|onlyChanged|roots|testFile|testMatch|testNamePatterns?|testPathPatterns?|testRegex|watch)=/.test(
				value
			)
		) {
			addViolation('testConfiguration', 'added', value);
		}
	}
	return violations.sort((left, right) =>
		compareCodePoints(
			`${left.category}:${left.kind}:${left.value}`,
			`${right.category}:${right.kind}:${right.value}`
		)
	);
}

function parseArguments(argv) {
	const args = {};
	for (const argument of argv) {
		if (!argument.startsWith('--') || !argument.includes('=')) throw new Error(`Unknown argument: ${argument}`);
		const separator = argument.indexOf('=');
		args[argument.slice(2, separator)] = argument.slice(separator + 1);
	}
	for (const required of ['base', 'head', 'allow', 'out']) {
		if (!args[required]) throw new Error(`Missing required --${required}=... argument`);
	}
	return args;
}

function readAllow(argument, cwd) {
	if (argument.trim().startsWith('[')) return JSON.parse(argument);
	return JSON.parse(readFileSync(resolve(cwd, argument), 'utf8'));
}

function assertTrackedHeadIsClean(cwd, head) {
	if (head !== 'HEAD') return;
	const changes = runGit(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=no']);
	if (changes.length > 0) {
		throw new Error(
			'Refusing --head=HEAD because tracked changes differ from HEAD; commit them or use an explicit ref'
		);
	}
}

function runCli(argv) {
	const cwd = process.cwd();
	const args = parseArguments(argv);
	assertTrackedHeadIsClean(cwd, args.head);
	const allow = readAllow(args.allow, cwd);
	const base = collectSurface(args.base, { cwd });
	const head = collectSurface(args.head, { cwd });
	const violations = compareSurface(base, head, allow);
	const report = {
		allow,
		base,
		head,
		ok: violations.length === 0,
		violations
	};
	const destination = resolve(cwd, args.out);
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
	if (violations.length > 0) {
		console.error(`Ever Teams feature preservation failed with ${violations.length} violation(s).`);
		for (const violation of violations)
			console.error(`- ${violation.kind} ${violation.category}: ${violation.value}`);
		process.exitCode = 1;
	} else {
		console.log(
			`Ever Teams feature preservation passed (${base.commit.slice(0, 12)}..${head.commit.slice(0, 12)}).`
		);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		runCli(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 2;
	}
}
