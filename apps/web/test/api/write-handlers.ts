/**
 * Test-only (never part of the app): every write handler (POST, PUT, PATCH, DELETE) of the routes under app/api, read
 * from their source, and what each calls first that keeps another site's page out (`refuseForeignOrigin`, or a proxy
 * helper that refuses a foreign write itself).
 */
import fs from 'node:fs';
import path from 'node:path';

export type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface WriteHandler {
	/** The route's folder under app/api, such as `timer/started-at`. */
	route: string;
	method: WriteMethod;
	/** The handler's own source, or the source of the local function an `export const` names. */
	source: string;
}

/** The app/api folder of apps/web. */
const API_DIR = path.join(__dirname, '..', '..', 'app', 'api');

const WRITE = '(POST|PUT|PATCH|DELETE)';

function routeFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return routeFiles(full);
		return entry.name === 'route.ts' ? [full] : [];
	});
}

/** The source from `start` to the next top-level declaration. */
function declarationAt(source: string, start: number): string {
	const rest = source.slice(start + 1);
	const next = rest.search(/\n(?=export |async function |function |const |let |type |interface )/);
	return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
}

function handlersOf(file: string): WriteHandler[] {
	const source = fs.readFileSync(file, 'utf8');
	const route = path.relative(API_DIR, path.dirname(file)).split(path.sep).join('/');
	const handlers: WriteHandler[] = [];

	for (const match of source.matchAll(
		new RegExp(`export\\s+async\\s+function\\s+${WRITE}\\b|export\\s+function\\s+${WRITE}\\b`, 'g')
	)) {
		handlers.push({
			route,
			method: (match[1] ?? match[2]) as WriteMethod,
			source: declarationAt(source, match.index)
		});
	}

	for (const match of source.matchAll(new RegExp(`export\\s+const\\s+${WRITE}\\s*=\\s*([^;\\n]+)`, 'g'))) {
		const value = match[2].trim();
		const local = /^\w+$/.test(value)
			? new RegExp(`(?:async\\s+)?function\\s+${value}\\s*\\(|const\\s+${value}\\s*=`).exec(source)
			: null;
		// `export const POST = forwardMappings` names a local function; `export const POST = async (req) => {` is one
		const declaration = local ? local.index : match.index;
		handlers.push({ route, method: match[1] as WriteMethod, source: declarationAt(source, declaration) });
	}

	// `export { POST } from '../_signin-workspace/route'`: the statement stands for the handler, which another route owns
	for (const match of source.matchAll(/export\s*\{([^}]*)\}[^;\n]*/g)) {
		for (const name of match[1].split(',')) {
			const exported = name
				.trim()
				.split(/\s+as\s+/)
				.pop();
			if (exported && new RegExp(`^${WRITE}$`).test(exported)) {
				handlers.push({ route, method: exported as WriteMethod, source: match[0] });
			}
		}
	}
	return handlers;
}

/** Every write handler under app/api, sorted by route then method. */
export function writeHandlers(): WriteHandler[] {
	return routeFiles(API_DIR)
		.flatMap(handlersOf)
		.sort((a, b) => a.route.localeCompare(b.route) || a.method.localeCompare(b.method));
}

/** The handler checks where the request comes from itself. */
export function callsRefuseForeignOrigin(handler: WriteHandler): boolean {
	return /\brefuseForeignOrigin\(/.test(handler.source);
}

/**
 * The handler hands the request on through forwardToGauzy, or first through refuseUnlessPermitted /
 * refuseWithoutPermission: each refuses a write of another site's page before it reads the session.
 */
export function forwardsThroughProxyHelper(handler: WriteHandler): boolean {
	return /\b(forwardToGauzy|refuseUnlessPermitted|refuseWithoutPermission)\(/.test(handler.source);
}
