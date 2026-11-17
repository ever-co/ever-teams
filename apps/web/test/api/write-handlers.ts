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

/**
 * The top-level function or variable a name declares in this file, as source text: only its own declaration, never
 * the others of a `const a = ..., b = ...` statement.
 */
function localDeclarationOf(file: ts.SourceFile, name: string): string | null {
	for (const statement of file.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement.getText(file);
		if (!ts.isVariableStatement(statement)) continue;
		const own = statement.declarationList.declarations.find((d) => ts.isIdentifier(d.name) && d.name.text === name);
		if (own) return own.getText(file);
	}
	return null;
}

/** An exported name, with the source of the code it runs. */
type Export = [name: string, source: string];

/** `export const POST = forwardMappings`, `export const POST: Handler = async (req) => {}`, `export const { POST } = x`. */
function exportsOfVariables(file: ts.SourceFile, statement: ts.VariableStatement): Export[] {
	const text = statement.getText(file);
	return statement.declarationList.declarations.flatMap((declaration): Export[] => {
		if (ts.isObjectBindingPattern(declaration.name)) {
			return declaration.name.elements.flatMap((e): Export[] =>
				ts.isIdentifier(e.name) ? [[e.name.text, text]] : []
			);
		}
		if (!ts.isIdentifier(declaration.name)) return [];
		// Only this declaration: in `export const POST = ..., PUT = ...` each handler is read from its own
		const init = declaration.initializer;
		const named = init && ts.isIdentifier(init) ? localDeclarationOf(file, init.text) : null;
		return [[declaration.name.text, named ?? declaration.getText(file)]];
	});
}

/** `export { POST } from '../_signin-workspace/route'`, `export { handler as POST }`. */
function exportsOfDeclaration(file: ts.SourceFile, statement: ts.ExportDeclaration): Export[] {
	const clause = statement.exportClause;
	if (!clause || !ts.isNamedExports(clause)) return [];
	return clause.elements.map((specifier): Export => {
		const local = statement.moduleSpecifier
			? null
			: localDeclarationOf(file, (specifier.propertyName ?? specifier.name).text);
		return [specifier.name.text, local ?? statement.getText(file)];
	});
}

function exportsOf(file: ts.SourceFile, statement: ts.Statement): Export[] {
	if (ts.isFunctionDeclaration(statement)) {
		return isExported(statement) && statement.name ? [[statement.name.text, statement.getText(file)]] : [];
	}
	if (ts.isVariableStatement(statement)) return isExported(statement) ? exportsOfVariables(file, statement) : [];
	if (ts.isExportDeclaration(statement)) return exportsOfDeclaration(file, statement);
	return [];
}

/** The write handlers a route file's source exports. */
export function writeHandlersIn(route: string, sourceText: string): WriteHandler[] {
	const file = ts.createSourceFile(`${route}/route.ts`, sourceText, ts.ScriptTarget.Latest, true);
	return file.statements
		.flatMap((statement) => exportsOf(file, statement))
		.filter(([name]) => WRITE_METHODS.has(name))
		.map(([name, source]) => ({ route, method: name as WriteMethod, source }));
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
