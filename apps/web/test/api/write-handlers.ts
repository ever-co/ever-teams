/**
 * Test-only (never part of the app): every write handler (POST, PUT, PATCH, DELETE) of the routes under app/api, read
 * from their source with the TypeScript parser, and what each calls first that keeps another site's page out
 * (`refuseForeignOrigin`, or a proxy helper that refuses a foreign write itself).
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface WriteHandler {
	/** The route's folder under app/api, such as `timer/started-at`. */
	route: string;
	method: WriteMethod;
	/**
	 * The handler's own source: its declaration, the local function an `export const` or `export { }` names, or the
	 * export statement itself when the handler comes from another module.
	 */
	source: string;
}

/** The app/api folder of apps/web. */
const API_DIR = path.join(__dirname, '..', '..', 'app', 'api');

const WRITE_METHODS: ReadonlySet<string> = new Set<WriteMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);

function routeFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return routeFiles(full);
		return entry.name === 'route.ts' ? [full] : [];
	});
}

function isExported(node: ts.Node): boolean {
	return ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** The top-level function or variable a name declares in this file, as source text. */
function localDeclarationOf(file: ts.SourceFile, name: string): string | null {
	for (const statement of file.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement.getText(file);
		if (
			ts.isVariableStatement(statement) &&
			statement.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === name)
		) {
			return statement.getText(file);
		}
	}
	return null;
}

/** The write handlers a route file's source exports. */
export function writeHandlersIn(route: string, sourceText: string): WriteHandler[] {
	const file = ts.createSourceFile(`${route}/route.ts`, sourceText, ts.ScriptTarget.Latest, true);
	const handlers: WriteHandler[] = [];
	const add = (name: string, source: string) => {
		if (WRITE_METHODS.has(name)) handlers.push({ route, method: name as WriteMethod, source });
	};

	for (const statement of file.statements) {
		// export async function POST(req) { ... }
		if (ts.isFunctionDeclaration(statement) && isExported(statement) && statement.name) {
			add(statement.name.text, statement.getText(file));
		}

		// export const POST = forwardMappings; export const POST: Handler = async (req) => { ... };
		// export const { GET, POST } = handlers;
		if (ts.isVariableStatement(statement) && isExported(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					const init = declaration.initializer;
					const named = init && ts.isIdentifier(init) ? localDeclarationOf(file, init.text) : null;
					add(declaration.name.text, named ?? statement.getText(file));
				} else if (ts.isObjectBindingPattern(declaration.name)) {
					for (const element of declaration.name.elements) {
						if (ts.isIdentifier(element.name)) add(element.name.text, statement.getText(file));
					}
				}
			}
		}

		// export { POST } from '../_signin-workspace/route'; export { handler as POST };
		if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
			for (const specifier of statement.exportClause.elements) {
				const local = statement.moduleSpecifier
					? null
					: localDeclarationOf(file, (specifier.propertyName ?? specifier.name).text);
				add(specifier.name.text, local ?? statement.getText(file));
			}
		}
	}
	return handlers;
}

/** Every write handler under app/api, sorted by route then method. */
export function writeHandlers(): WriteHandler[] {
	return routeFiles(API_DIR)
		.flatMap((fileName) =>
			writeHandlersIn(
				path.relative(API_DIR, path.dirname(fileName)).split(path.sep).join('/'),
				fs.readFileSync(fileName, 'utf8')
			)
		)
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
