#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const ROUTE_FILE = /^apps\/web\/app\/(?:.*\/)?(?:page|layout)\.(?:[jt]sx?)$/;
const TEST_FILE = /(?:^|\/)(?:__tests__\/.*|[^/]+\.(?:spec|test|cy|e2e))\.[cm]?[jt]sx?$/;
const BARREL_FILE = /(?:^|\/)index\.[cm]?[jt]sx?$/;
const SERVICE_FILE = /(?:^|\/)(?:services?\/.*|[^/]+\.service)\.[cm]?[jt]sx?$/;
const TEXT_FILE = /(?:\.(?:[cm]?[jt]sx?|json|ya?ml|env|sample)|(?:^|\/)Dockerfile)$/;
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

function runGit(cwd, args, input) {
	const result = spawnSync('git', args, {
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

function addExport(exports, name, kind) {
	if (!name) return;
	const kinds = exports.get(name) ?? new Set();
	kinds.add(kind);
	exports.set(name, kinds);
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
	const reexports = [];
	const sourceFile = parseSource(path, source);
	for (const statement of sourceFile.statements) {
		const names = declarationNames(statement);
		const kinds = declarationKinds(statement);
		for (const name of names) for (const kind of kinds) addExport(locals, name, kind);

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
			addExport(direct, statement.isExportEquals ? 'export=' : 'default', 'runtime');
			continue;
		}
		if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
		if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
			for (const kind of kinds.length > 0 ? kinds : ['runtime']) addExport(direct, 'default', kind);
		} else {
			for (const name of names) for (const kind of kinds) addExport(direct, name, kind);
		}
	}
	return { direct, locals, reexports };
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

function resolveLocalModule(fromPath, specifier, files) {
	if (!specifier?.startsWith('.')) return undefined;
	const base = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
	const roots = [base];
	const importedExtension = posix.extname(base);
	if (MODULE_EXTENSIONS.includes(importedExtension)) roots.push(base.slice(0, -importedExtension.length));
	const candidates = [...roots];
	for (const root of roots) for (const extension of MODULE_EXTENSIONS) candidates.push(`${root}${extension}`);
	for (const root of roots) {
		for (const extension of MODULE_EXTENSIONS) candidates.push(`${root}/index${extension}`);
	}
	return candidates.find((candidate) => files.has(candidate));
}

function copyExports(source) {
	const copy = new Map();
	for (const [name, kinds] of source) copy.set(name, new Set(kinds));
	return copy;
}

function sameExports(left, right) {
	if (left.size !== right.size) return false;
	for (const [name, kinds] of left) {
		const other = right.get(name);
		if (!other || kinds.size !== other.size || [...kinds].some((kind) => !other.has(kind))) return false;
	}
	return true;
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
		for (const reexport of info.reexports) {
			const target = resolveLocalModule(path, reexport.specifier, files);
			if (target && !infos.has(target)) pending.push(target);
		}
	}

	let resolved = new Map([...infos].map(([path, info]) => [path, copyExports(info.direct)]));
	for (let iteration = 0; iteration <= infos.size; iteration += 1) {
		let changed = false;
		const next = new Map();
		for (const [path, info] of infos) {
			const exports = copyExports(info.direct);
			for (const reexport of info.reexports) {
				if (reexport.kind === 'namespace') {
					addExport(exports, reexport.name, reexport.typeOnly ? 'type' : 'runtime');
					continue;
				}
				const targetPath = resolveLocalModule(path, reexport.specifier, files);
				const targetExports = targetPath ? resolved.get(targetPath) : undefined;
				if (reexport.kind === 'star') {
					if (!targetExports) {
						if (reexport.specifier) {
							addExport(exports, `* from ${reexport.specifier}`, reexport.typeOnly ? 'type' : 'runtime');
						}
						continue;
					}
					for (const [name, kinds] of targetExports) {
						if (name === 'default' || name === 'export=') continue;
						for (const kind of reexport.typeOnly ? ['type'] : kinds) addExport(exports, name, kind);
					}
					continue;
				}
				const sourceExports = targetExports ?? (reexport.specifier ? new Map() : info.locals);
				const kinds = sourceExports.get(reexport.sourceName);
				if (reexport.typeOnly) addExport(exports, reexport.name, 'type');
				else if (kinds) for (const kind of kinds) addExport(exports, reexport.name, kind);
				else addExport(exports, reexport.name, 'runtime');
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
			for (const kind of kinds) exports.push(`${path}::${kind}::${name}`);
		}
	}
	return exports;
}

function testChain(expression) {
	if (ts.isParenthesizedExpression(expression)) return testChain(expression.expression);
	if (ts.isCallExpression(expression)) return testChain(expression.expression);
	if (ts.isTaggedTemplateExpression(expression)) return testChain(expression.tag);
	if (ts.isPropertyAccessExpression(expression)) {
		const parent = testChain(expression.expression);
		return parent ? [...parent, expression.name.text] : undefined;
	}
	if (ts.isElementAccessExpression(expression) && expression.argumentExpression) {
		const parent = testChain(expression.expression);
		const member = ts.isStringLiteralLike(expression.argumentExpression)
			? expression.argumentExpression.text
			: undefined;
		return parent && member ? [...parent, member] : undefined;
	}
	if (ts.isIdentifier(expression)) {
		if (/^(?:describe|it|test|xdescribe|xit|xtest|fdescribe|fit|ftest)$/.test(expression.text)) {
			return [expression.text];
		}
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
	const visit = (node) => {
		if (ts.isCallExpression(node) && node.arguments.length > 0) {
			const chain = testChain(node.expression);
			const title = testTitle(node.arguments[0], sourceFile);
			if (chain && title) {
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
const UNRESOLVED_SPREADS = Symbol('unresolved-spreads');
const TEST_SELECTION_KEYS = new Set([
	'roots',
	'testMatch',
	'testNamePattern',
	'testNamePatterns',
	'testPathPattern',
	'testPathPatterns',
	'testRegex'
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
		ts.isStringLiteralLike(expression.argumentExpression)
	) {
		return expression.argumentExpression.text;
	}
	return undefined;
}

function staticValue(node, values, seen = new Set()) {
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
				const spread = staticValue(element.expression, values, seen);
				if (!Array.isArray(spread)) return UNRESOLVED;
				result.push(...spread);
			} else {
				result.push(staticValue(element, values, seen));
			}
		}
		return result;
	}
	if (ts.isObjectLiteralExpression(node)) {
		const result = {};
		for (const property of node.properties) {
			if (ts.isSpreadAssignment(property)) {
				const spread = staticValue(property.expression, values, seen);
				if (spread && typeof spread === 'object' && !Array.isArray(spread)) Object.assign(result, spread);
				else {
					result[UNRESOLVED_SPREADS] = [...(result[UNRESOLVED_SPREADS] ?? []), property.getText()];
				}
				continue;
			}
			const name = propertyName(property);
			if (!name) continue;
			if (ts.isPropertyAssignment(property)) result[name] = staticValue(property.initializer, values, seen);
			else if (ts.isShorthandPropertyAssignment(property)) {
				result[name] = values.get(property.name.text) ?? UNRESOLVED;
			}
		}
		return result;
	}
	if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
		const name = accessPropertyName(node);
		const parent = staticValue(node.expression, values, seen);
		return name && parent && typeof parent === 'object' ? (parent[name] ?? UNRESOLVED) : UNRESOLVED;
	}
	if (ts.isCallExpression(node) && node.arguments.length > 0) return staticValue(node.arguments[0], values, seen);
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		const left = staticValue(node.left, values, seen);
		const right = staticValue(node.right, values, seen);
		if (left !== UNRESOLVED && right !== UNRESOLVED) return String(left) + String(right);
	}
	return UNRESOLVED;
}

function flattenedValues(value) {
	if (value === UNRESOLVED) return ['<unresolved>'];
	if (Array.isArray(value)) return value.flatMap(flattenedValues);
	if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return [String(value)];
	return ['<unresolved>'];
}

function recordConfigOptions(path, options, prefix, configuration, exclusions) {
	if (!options || typeof options !== 'object' || Array.isArray(options)) return;
	for (const [name, value] of Object.entries(options)) {
		if (TEST_SELECTION_KEYS.has(name)) {
			for (const item of flattenedValues(value)) configuration.push(`${path}::${prefix}${name}=${item}`);
		} else if (/ignore|exclude/i.test(name)) {
			for (const item of flattenedValues(value)) exclusions.push(`${path}::${prefix}${name}=${item}`);
		} else if (name === 'passWithNoTests') {
			for (const item of flattenedValues(value)) configuration.push(`${path}::${prefix}${name}=${item}`);
			if (value === true) exclusions.push(`${path}::${prefix}${name}=true`);
		}
	}
	for (const spread of options[UNRESOLVED_SPREADS] ?? []) {
		exclusions.push(`${path}::${prefix}<unresolvedSpread>=${spread}`);
	}
}

function assignStaticProperty(expression, value, values) {
	const name = accessPropertyName(expression);
	const root = expression.expression;
	if (!name || !ts.isIdentifier(root)) return;
	const target = values.get(root.text);
	if (target && typeof target === 'object' && !Array.isArray(target)) target[name] = value;
}

function collectJestConfig(path, source, configuration, exclusions) {
	const sourceFile = parseSource(path, source);
	const values = new Map();
	let exported;
	for (const statement of sourceFile.statements) {
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name) && declaration.initializer) {
					values.set(declaration.name.text, staticValue(declaration.initializer, values));
				}
			}
			continue;
		}
		if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
			const assignment = statement.expression;
			if (assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
				assignStaticProperty(assignment.left, staticValue(assignment.right, values), values);
			}
			continue;
		}
		if (
			ts.isExpressionStatement(statement) &&
			ts.isCallExpression(statement.expression) &&
			statement.expression.expression.getText(sourceFile) === 'Object.assign'
		) {
			const [targetNode, ...sourceNodes] = statement.expression.arguments;
			if (targetNode && ts.isIdentifier(targetNode)) {
				const target = values.get(targetNode.text);
				if (target && typeof target === 'object' && !Array.isArray(target)) {
					for (const sourceNode of sourceNodes) {
						const sourceValue = staticValue(sourceNode, values);
						if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
							Object.assign(target, sourceValue);
						} else target[UNRESOLVED_SPREADS] = ['Object.assign'];
					}
				}
			}
			continue;
		}
		if (ts.isExportAssignment(statement)) exported = staticValue(statement.expression, values);
	}
	const config = values.get('config') ?? exported;
	if (config && typeof config === 'object' && !Array.isArray(config)) {
		recordConfigOptions(path, config, '', configuration, exclusions);
	} else {
		exclusions.push(`${path}::<unresolvedConfig>`);
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
		} else if (TEST_SELECTION_KEYS.has(name)) {
			for (const item of flattenedValues(value)) configuration.push(`${path}::${key}=${item}`);
		} else if (/ignore|exclude/i.test(name)) {
			for (const item of flattenedValues(value)) exclusions.push(`${path}::${key}=${item}`);
		} else if (name === 'passWithNoTests') {
			configuration.push(`${path}::${key}=${String(value)}`);
			if (value === true) exclusions.push(`${path}::${key}=true`);
		}
	}
	for (const [name, value] of Object.entries(target.configurations ?? {})) {
		collectJsonTarget(path, value, `${prefix}.configurations.${name}`, trackedPaths, configuration, exclusions);
	}
}

function collectTestConfiguration(path, source, trackedPaths) {
	const configuration = [];
	const exclusions = [];
	if (/(?:^|\/)(?:project|workspace|nx)\.json$/.test(path)) {
		let root;
		try {
			root = JSON.parse(source);
		} catch (error) {
			throw new Error(`Unable to parse test configuration ${path}: ${error.message}`);
		}
		if (root?.targets?.test) {
			collectJsonTarget(path, root.targets.test, 'targets.test', trackedPaths, configuration, exclusions);
		}
		if (root?.projects?.web?.targets?.test) {
			collectJsonTarget(
				path,
				root.projects.web.targets.test,
				'projects.web.targets.test',
				trackedPaths,
				configuration,
				exclusions
			);
		}
		for (const [name, target] of Object.entries(root?.targetDefaults ?? {})) {
			if (name === 'test' || /jest/i.test(name) || /jest/i.test(String(target?.executor ?? ''))) {
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

function collectOverlayComponents(path, source) {
	const components = [];
	const sourceFile = parseSource(path, source);
	const addNames = (names) => {
		for (const name of names) if (isOverlayName(name)) components.push(`${path}::${name}`);
	};
	const visit = (node) => {
		if (ts.isVariableDeclaration(node)) {
			const names = [];
			collectBindingNames(node.name, names);
			addNames(names);
		} else if (
			(ts.isFunctionDeclaration(node) ||
				ts.isClassDeclaration(node) ||
				ts.isInterfaceDeclaration(node) ||
				ts.isTypeAliasDeclaration(node) ||
				ts.isEnumDeclaration(node)) &&
			node.name
		) {
			addNames([node.name.text]);
		} else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
			addNames(node.exportClause.elements.map((element) => element.name.text));
		} else if (ts.isNamespaceExport(node)) {
			addNames([node.name.text]);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return components;
}

function staticString(node, values = new Map()) {
	const value = staticValue(node, values);
	return typeof value === 'string' ? value : undefined;
}

function environmentAccessSegments(node) {
	node = unwrapExpression(node);
	if (!node) return undefined;
	if (ts.isIdentifier(node)) return [node.text];
	if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
		return ['import', node.name.text];
	}
	if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
		const parent = environmentAccessSegments(node.expression);
		const name = accessPropertyName(node);
		return parent && name ? [...parent, name] : undefined;
	}
	return undefined;
}

function collectNavigationAndEnvironment(path, source) {
	const navigation = [];
	const nextPublicOccurrences = [];
	const sourceFile = parseSource(path, source);
	const values = new Map();
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (ts.isIdentifier(declaration.name) && declaration.initializer) {
				values.set(declaration.name.text, staticValue(declaration.initializer, values));
			}
		}
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

		if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
			const segments = environmentAccessSegments(node);
			const name = segments?.at(-1);
			const prefix = segments?.slice(0, -1).join('.');
			if (name?.startsWith('NEXT_PUBLIC_') && (prefix === 'process.env' || prefix === 'import.meta.env')) {
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

	for (const [path, source] of files) {
		if (ROUTE_FILE.test(path)) surface.routes.push(path);
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
			/::.*(?:roots|testMatch|testNamePatterns?|testPathPatterns?|testRegex)=/.test(value)
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
