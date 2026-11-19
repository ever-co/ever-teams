/**
 * Reading the app's own route handlers: the walk and the verb extraction shared by
 * collect-api-routes.mjs (which writes the manifest the suite runs over) and
 * collect-empty-body-blockers.mjs (which records which handlers cannot take a bodiless call).
 *
 * Both need the same truth: which files under apps/web/app/api are route handlers, and which HTTP
 * verbs each one exports. Keeping it in one place is what stops the two drifting.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function apiRouteFiles(apiRoot) {
	const found = [];
	for (const entry of readdirSync(apiRoot)) {
		const full = resolve(apiRoot, entry);
		if (statSync(full).isDirectory()) found.push(...apiRouteFiles(full));
		else if (full.endsWith('route.ts')) found.push(full);
	}
	return found.sort();
}

/** `app/api/auth/login/route.ts` -> `/api/auth/login`, keeping Next's dynamic segments as written. */
export function routeUrl(apiRoot, file) {
	const rel = relative(apiRoot, file).replace(/\\/g, '/').replace(/(^|\/)route\.ts$/, '');
	// app/api/route.ts is the handler for /api itself, not a route called "route.ts".
	return rel === '' ? '/api' : `/api/${rel}`;
}

export function verbsOf(source) {
	const verbs = new Set();
	for (const verb of VERBS) {
		const pattern = new RegExp(
			`export\\s+(async\\s+)?function\\s+${verb}\\b|export\\s+const\\s+${verb}\\b|export\\s+{[^}]*\\b${verb}\\b`,
			'm'
		);
		if (pattern.test(source)) verbs.add(verb);
	}
	if (/export\s+default\s+/.test(source)) verbs.add('GET');
	return [...verbs];
}

/** Every handler under apps/web/app/api as { path, verbs }, plus the ones with no recognizable verb. */
export function collectApiRoutes(apiRoot) {
	const routes = [];
	const unattributed = [];
	for (const file of apiRouteFiles(apiRoot)) {
		const verbs = verbsOf(readFileSync(file, 'utf8'));
		const path = routeUrl(apiRoot, file);
		if (verbs.length === 0) unattributed.push(path);
		else routes.push({ path, verbs });
	}
	return { routes, unattributed };
}
