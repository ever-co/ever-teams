#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

function collectPublicExports(path, source) {
	const exports = [];
	const sourceFile = parseSource(path, source);
	for (const statement of sourceFile.statements) {
		if (ts.isExportDeclaration(statement)) {
			const moduleName =
				statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)
					? statement.moduleSpecifier.text
					: '';
			if (!statement.exportClause) exports.push(`${path}::* from ${moduleName}`);
			else if (ts.isNamespaceExport(statement.exportClause)) {
				exports.push(`${path}::${statement.exportClause.name.text}`);
			} else {
				for (const element of statement.exportClause.elements) exports.push(`${path}::${element.name.text}`);
			}
			continue;
		}
		if (ts.isExportAssignment(statement)) {
			exports.push(`${path}::${statement.isExportEquals ? 'export=' : 'default'}`);
			continue;
		}
		if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
		if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
			exports.push(`${path}::default`);
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			const names = [];
			for (const declaration of statement.declarationList.declarations) {
				collectBindingNames(declaration.name, names);
			}
			for (const name of names) exports.push(`${path}::${name}`);
		} else if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isInterfaceDeclaration(statement) ||
				ts.isTypeAliasDeclaration(statement) ||
				ts.isEnumDeclaration(statement) ||
				ts.isModuleDeclaration(statement)) &&
			statement.name
		) {
			exports.push(`${path}::${statement.name.text}`);
		}
	}
	return exports;
}

function testChain(expression) {
	if (ts.isParenthesizedExpression(expression)) return testChain(expression.expression);
	if (ts.isCallExpression(expression)) return testChain(expression.expression);
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

function literalValues(node) {
	if (!node) return [];
	if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return [node.text];
	if (node.kind === ts.SyntaxKind.TrueKeyword) return ['true'];
	if (node.kind === ts.SyntaxKind.FalseKeyword) return ['false'];
	if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(literalValues);
	return [];
}

function objectLiteral(node) {
	while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
		node = node.expression;
	}
	return ts.isObjectLiteralExpression(node) ? node : undefined;
}

function propertyName(property) {
	return property.name && (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
		? property.name.text
		: undefined;
}

function collectObjectConfig(path, object, prefix, configuration, exclusions) {
	for (const property of object.properties) {
		if (!ts.isPropertyAssignment(property)) continue;
		const name = propertyName(property);
		if (!name) continue;
		const values = literalValues(property.initializer);
		if (['testMatch', 'testRegex', 'roots'].includes(name)) {
			for (const value of values) configuration.push(`${path}::${prefix}${name}=${value}`);
		} else if (/ignore|exclude/i.test(name)) {
			for (const value of values) exclusions.push(`${path}::${prefix}${name}=${value}`);
		}
	}
}

function collectTestConfiguration(path, source, trackedPaths) {
	const configuration = [];
	const exclusions = [];
	if (/(?:^|\/)(?:project|workspace|nx)\.json$/.test(path)) {
		try {
			const root = JSON.parse(source);
			const testTarget = root?.targets?.test ?? root?.projects?.web?.targets?.test;
			if (testTarget && typeof testTarget === 'object') {
				if (typeof testTarget.executor === 'string') {
					configuration.push(`${path}::targets.test.executor=${testTarget.executor}`);
				}
				for (const [name, value] of Object.entries(testTarget.options ?? {})) {
					const key = `targets.test.options.${name}`;
					if (name === 'jestConfig' && trackedPaths.has(String(value).replaceAll('\\', '/'))) {
						configuration.push(`${path}::${key}=${String(value)}`);
					} else if (name === 'passWithNoTests') {
						configuration.push(`${path}::${key}=${String(value)}`);
						if (value === true) exclusions.push(`${path}::${key}=true`);
					} else if (['testMatch', 'testRegex', 'roots'].includes(name)) {
						for (const item of Array.isArray(value) ? value : [value]) {
							configuration.push(`${path}::${key}=${String(item)}`);
						}
					} else if (/ignore|exclude/i.test(name)) {
						for (const item of Array.isArray(value) ? value : [value]) {
							exclusions.push(`${path}::${key}=${String(item)}`);
						}
					}
				}
			}
		} catch {
			return { configuration, exclusions };
		}
	}
	if (/(?:^|\/)jest\.config\.[cm]?[jt]s$/.test(path)) {
		const sourceFile = parseSource(path, source);
		for (const statement of sourceFile.statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const declaration of statement.declarationList.declarations) {
				if (
					ts.isIdentifier(declaration.name) &&
					declaration.name.text === 'config' &&
					declaration.initializer
				) {
					const config = objectLiteral(declaration.initializer);
					if (config) collectObjectConfig(path, config, '', configuration, exclusions);
				}
			}
		}
	}
	return { configuration, exclusions };
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

	for (const [path, source] of files) {
		if (ROUTE_FILE.test(path)) surface.routes.push(path);
		if (SOURCE_FILE.test(path) && WEB_SURFACE_FILE.test(path)) {
			const basename = path.slice(path.lastIndexOf('/') + 1).replace(SOURCE_FILE, '');
			if (/(?:modal|dialog|drawer)/i.test(basename)) surface.overlayComponents.push(path);
			for (const match of source.matchAll(
				/\b(?:function|class|const)\s+([A-Za-z_$][\w$]*(?:Modal|Dialog|Drawer)[A-Za-z_$\d]*)\b/g
			)) {
				surface.overlayComponents.push(`${path}::${match[1]}`);
			}
			for (const match of source.matchAll(/\bhref\s*(?:=|:)\s*(?:\{\s*)?(['"`])([^'"`]+)\1/g)) {
				surface.navigation.push(`${path}::href=${match[2]}`);
			}
			for (const match of source.matchAll(
				/\b([A-Z][A-Z0-9_]*(?:ROUTE|PATH|URL)[A-Z0-9_]*)\s*(?:=|:)\s*(['"`])([^'"`]+)\2/g
			)) {
				surface.navigation.push(`${path}::${match[1]}=${match[3]}`);
			}
			for (const match of source.matchAll(
				/\b(?:const|let|var)\s+([A-Z][A-Z0-9_]*(?:ROUTE|PATH|URL)[A-Z0-9_]*)\b/g
			)) {
				surface.navigation.push(`${path}::constant=${match[1]}`);
			}
			if (BARREL_FILE.test(path)) surface.publicExports.push(...collectPublicExports(path, source));
			if (SERVICE_FILE.test(path) && API_SERVICE_FILE.test(path)) {
				surface.serviceMethods.push(...collectServiceMethods(path, source));
			}
		}
		if (SOURCE_FILE.test(path) && TEST_FILE.test(path)) {
			const tests = collectTests(path, source);
			surface.testNames.push(...tests.names);
			surface.testMarkers.push(...tests.markers);
		}
		for (const match of source.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g)) {
			surface.nextPublicOccurrences.push(`${path}::${match[0]}`);
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
