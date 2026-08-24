#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const ROUTE_FILE = /^apps\/web\/app\/.+\/(?:page|layout)\.(?:[jt]sx?)$/;
const TEST_FILE = /(?:^|\/)(?:__tests__\/.*|[^/]+\.(?:spec|test))\.[cm]?[jt]sx?$/;
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

function sorted(values) {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function withoutComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function maskStringsAndComments(source) {
	const chars = [...source];
	let state = 'code';
	let quote = '';
	for (let index = 0; index < chars.length; index += 1) {
		const current = chars[index];
		const next = chars[index + 1];
		if (state === 'line-comment') {
			if (current === '\n') state = 'code';
			else chars[index] = ' ';
			continue;
		}
		if (state === 'block-comment') {
			if (current === '*' && next === '/') {
				chars[index] = ' ';
				chars[index + 1] = ' ';
				index += 1;
				state = 'code';
			} else if (current !== '\n') chars[index] = ' ';
			continue;
		}
		if (state === 'string') {
			if (current === '\\') {
				chars[index] = ' ';
				if (index + 1 < chars.length && chars[index + 1] !== '\n') chars[index + 1] = ' ';
				index += 1;
				continue;
			}
			if (current === quote) {
				chars[index] = ' ';
				state = 'code';
			} else if (current !== '\n') chars[index] = ' ';
			continue;
		}
		if (current === '/' && next === '/') {
			chars[index] = ' ';
			chars[index + 1] = ' ';
			index += 1;
			state = 'line-comment';
		} else if (current === '/' && next === '*') {
			chars[index] = ' ';
			chars[index + 1] = ' ';
			index += 1;
			state = 'block-comment';
		} else if (current === "'" || current === '"' || current === '`') {
			quote = current;
			chars[index] = ' ';
			state = 'string';
		}
	}
	return chars.join('');
}

function matchingBrace(source, openIndex) {
	let depth = 0;
	for (let index = openIndex; index < source.length; index += 1) {
		if (source[index] === '{') depth += 1;
		else if (source[index] === '}') {
			depth -= 1;
			if (depth === 0) return index;
		}
	}
	return -1;
}

function depthAtOffsets(source) {
	const depths = new Uint16Array(source.length + 1);
	let depth = 0;
	for (let index = 0; index < source.length; index += 1) {
		depths[index] = depth;
		if (source[index] === '{') depth += 1;
		else if (source[index] === '}') depth = Math.max(0, depth - 1);
	}
	depths[source.length] = depth;
	return depths;
}

function collectServiceMethods(path, source) {
	const methods = [];
	const masked = maskStringsAndComments(source);
	const classPattern = /\bclass\s+([A-Za-z_$][\w$]*)[^\{]*\{/g;
	for (const classMatch of masked.matchAll(classPattern)) {
		const className = classMatch[1];
		const open = classMatch.index + classMatch[0].lastIndexOf('{');
		const close = matchingBrace(masked, open);
		if (close === -1) continue;
		const body = masked.slice(open + 1, close);
		const depths = depthAtOffsets(body);
		const methodPattern =
			/^[ \t]*(?:(?:public|protected|private|static|async|override|abstract|readonly|get|set)\s+)*([A-Za-z_$][\w$]*)\s*(?:<[^;\n\{]*>)?\s*\(/gm;
		for (const methodMatch of body.matchAll(methodPattern)) {
			if (depths[methodMatch.index] !== 0) continue;
			if (/\b(?:private|protected)\b/.test(methodMatch[0])) continue;
			const methodName = methodMatch[1];
			if (methodName !== 'constructor') methods.push(`${path}::${className}.${methodName}`);
		}
		const propertyPattern =
			/^[ \t]*(?:(?:public|static|async|override|readonly)\s+)*([A-Za-z_$][\w$]*)[^;\n=]*=\s*(?:async\s*)?(?:\([^\n]*\)|[A-Za-z_$][\w$]*)\s*=>/gm;
		for (const propertyMatch of body.matchAll(propertyPattern)) {
			if (depths[propertyMatch.index] === 0) methods.push(`${path}::${className}.${propertyMatch[1]}`);
		}
	}
	return methods;
}

function collectPublicExports(path, source) {
	const exports = [];
	const code = withoutComments(source);
	for (const match of code.matchAll(/\bexport\s+\*\s+from\s+(['"])([^'"]+)\1/g)) {
		exports.push(`${path}::* from ${match[2]}`);
	}
	for (const match of code.matchAll(/\bexport\s+\{([\s\S]*?)\}(?:\s+from\s+(['"])[^'"]+\2)?\s*;?/g)) {
		for (const item of match[1].split(',')) {
			const normalized = item.trim().replace(/^type\s+/, '');
			if (!normalized) continue;
			const alias = normalized.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
			const name = alias?.[1] ?? normalized.match(/^([A-Za-z_$][\w$]*)/)?.[1];
			if (name) exports.push(`${path}::${name}`);
		}
	}
	for (const match of code.matchAll(
		/\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g
	)) {
		exports.push(`${path}::${match[1]}`);
	}
	return exports;
}

function collectTests(path, source) {
	const names = [];
	const markers = [];
	const occurrences = new Map();
	const code = withoutComments(source);
	const testPattern = /\b(describe|it|test)\s*(?:\.\s*(skip|only|todo))?\s*\(\s*(['"`])([^'"`\r\n]+)\3/g;
	for (const match of code.matchAll(testPattern)) {
		const title = match[4];
		const count = (occurrences.get(title) ?? 0) + 1;
		occurrences.set(title, count);
		names.push(`${path}::${title}::${count}`);
		if (match[2]) markers.push(`${path}::${match[1]}.${match[2]}::${title}`);
	}
	const prefixedPattern = /\b([xf])(describe|it|test)\s*\(\s*(['"`])([^'"`\r\n]+)\3/g;
	for (const match of code.matchAll(prefixedPattern)) {
		const title = match[4];
		const count = (occurrences.get(title) ?? 0) + 1;
		occurrences.set(title, count);
		names.push(`${path}::${title}::${count}`);
		markers.push(`${path}::${match[1]}${match[2]}::${title}`);
	}
	return { markers, names };
}

function collectExclusions(path, source) {
	const exclusions = [];
	if (/(?:^|\/)(?:project|workspace|nx)\.json$/.test(path)) {
		try {
			const value = JSON.parse(source);
			const visit = (node, keyPath = []) => {
				if (!node || typeof node !== 'object') return;
				for (const [key, child] of Object.entries(node)) {
					const nextPath = [...keyPath, key];
					if (/exclude|ignore/i.test(key) || (key === 'passWithNoTests' && child === true)) {
						exclusions.push(`${path}::${nextPath.join('.')}=${JSON.stringify(child)}`);
					}
					visit(child, nextPath);
				}
			};
			visit(value);
		} catch {
			// Non-JSON text is still scanned below when it is a Jest config.
		}
	}
	if (/(?:^|\/)jest\.config\.[cm]?[jt]s$/.test(path)) {
		for (const match of source.matchAll(
			/\b(testPathIgnorePatterns|coveragePathIgnorePatterns|modulePathIgnorePatterns|transformIgnorePatterns|watchPathIgnorePatterns)\s*:\s*\[([\s\S]*?)\]/g
		)) {
			for (const value of match[2].matchAll(/(['"`])([^'"`]+)\1/g)) {
				exclusions.push(`${path}::${match[1]}=${value[2]}`);
			}
		}
	}
	return exclusions;
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
		testMarkers: [],
		testNames: []
	};

	for (const [path, source] of files) {
		if (ROUTE_FILE.test(path)) surface.routes.push(path);
		if (SOURCE_FILE.test(path) && WEB_SURFACE_FILE.test(path)) {
			const code = withoutComments(source);
			const basename = path.slice(path.lastIndexOf('/') + 1).replace(SOURCE_FILE, '');
			if (/(?:modal|dialog|drawer)/i.test(basename)) surface.overlayComponents.push(path);
			for (const match of code.matchAll(
				/\b(?:function|class|const)\s+([A-Za-z_$][\w$]*(?:Modal|Dialog|Drawer)[A-Za-z_$\d]*)\b/g
			)) {
				surface.overlayComponents.push(`${path}::${match[1]}`);
			}
			for (const match of code.matchAll(/\bhref\s*(?:=|:)\s*(?:\{\s*)?(['"`])([^'"`]+)\1/g)) {
				surface.navigation.push(`${path}::href=${match[2]}`);
			}
			for (const match of code.matchAll(
				/\b([A-Z][A-Z0-9_]*(?:ROUTE|PATH|URL)[A-Z0-9_]*)\s*(?:=|:)\s*(['"`])([^'"`]+)\2/g
			)) {
				surface.navigation.push(`${path}::${match[1]}=${match[3]}`);
			}
			for (const match of code.matchAll(
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
		surface.exclusions.push(...collectExclusions(path, source));
	}

	for (const category of Object.keys(surface)) surface[category] = sorted(surface[category]);
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
		`${left.category}:${left.kind}:${left.value}`.localeCompare(`${right.category}:${right.kind}:${right.value}`)
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

function runCli(argv) {
	const cwd = process.cwd();
	const args = parseArguments(argv);
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
