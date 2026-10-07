/**
 * next/image hosts allowed at RUNTIME: the wiring around core/lib/helpers/image-request.ts.
 *
 * The optimizer's host allowlist (next.config images.remotePatterns) is frozen into the build, so
 * proxy.ts has to see `/_next/image` requests to serve a self-hoster's own image hosts. These tests
 * pin that the proxy matcher really reaches the optimizer endpoint (compiled with Next's own matcher
 * code), that image requests skip the i18n/auth handling, and that next.config keeps building the
 * exact same remotePatterns from image-hosts.js while exposing them to runtime code.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import type { ProxyMatcher } from 'next/dist/build/analysis/get-page-static-info';
import { getMiddlewareRouteMatcher } from 'next/dist/shared/lib/router/utils/middleware-route-matcher';
import { DEFAULT_IMAGE_HOSTS, parseImageHosts, serializeImageRemotePatterns } from '@/image-hosts';

// How Next compiles a proxy `config.matcher` into the runtime manifest (a runtime export that its
// type declarations omit).
const { getMiddlewareMatchers } = jest.requireActual<{
	getMiddlewareMatchers: (matcher: string[], nextConfig: object) => ProxyMatcher[];
}>('next/dist/build/analysis/get-page-static-info');

const WEB_ROOT = resolve(__dirname, '../..');

function parse(file: string): ts.SourceFile {
	return ts.createSourceFile(file, readFileSync(resolve(WEB_ROOT, file), 'utf8'), ts.ScriptTarget.Latest, true);
}

function proxyMatcher(source: ts.SourceFile): string[] {
	for (const statement of source.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'config') continue;
			const config = declaration.initializer;
			if (!config || !ts.isObjectLiteralExpression(config)) continue;
			for (const property of config.properties) {
				if (
					ts.isPropertyAssignment(property) &&
					ts.isIdentifier(property.name) &&
					property.name.text === 'matcher' &&
					ts.isArrayLiteralExpression(property.initializer)
				) {
					return property.initializer.elements.map((element) => {
						// Next reads the matcher statically: every entry must be a string literal.
						expect(ts.isStringLiteral(element)).toBe(true);
						return (element as ts.StringLiteral).text;
					});
				}
			}
		}
	}
	throw new Error('proxy.ts exports no config.matcher array');
}

describe('proxy.ts and /_next/image', () => {
	const source = parse('proxy.ts');
	const matcher = proxyMatcher(source);
	const matches = getMiddlewareRouteMatcher(getMiddlewareMatchers(matcher, {}));
	const request = { headers: {} } as never;

	it('lists the image optimizer endpoint in config.matcher', () => {
		expect(matcher).toContain('/_next/image');
	});

	it('runs for image optimizer requests without widening to other Next internals', () => {
		expect(matches('/_next/image', request, {})).toBe(true);
		expect(matches('/_next/image/', request, {})).toBe(true);
		expect(matches('/_next/static/chunks/main.js', request, {})).toBe(false);
		expect(matches('/_next/static/media/font.woff2', request, {})).toBe(false);
		expect(matches('/_next/imagex', request, {})).toBe(false);
		expect(matches('/api/auth/session', request, {})).toBe(false);
		expect(matches('/favicon.ico', request, {})).toBe(false);
		// Existing coverage unchanged.
		expect(matches('/', request, {})).toBe(true);
		expect(matches('/auth/passcode', request, {})).toBe(true);
		expect(matches('/fr/settings/personal', request, {})).toBe(true);
	});

	it('answers image requests before any i18n or auth handling', () => {
		const proxy = source.statements.find(
			(statement): statement is ts.FunctionDeclaration =>
				ts.isFunctionDeclaration(statement) && statement.name?.text === 'proxy'
		);
		const first = proxy?.body?.statements[0];

		expect(first && ts.isIfStatement(first)).toBe(true);
		const ifStatement = first as ts.IfStatement;
		expect(ifStatement.expression.getText(source)).toBe('isImageOptimizerRequest(request.nextUrl.pathname)');
		expect(ifStatement.thenStatement.getText(source)).toMatch(/^\{\s*return handleImageRequest\(request\);\s*\}$/);
	});

	it('reads the build-time optimizer hosts from the next.config env key and the runtime hosts dynamically', () => {
		const text = source.getFullText();
		expect(text).toContain('splitImageHostList(process.env.EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS)');
		expect(text).toContain('getRuntimeImageHosts()');
		expect(text).toMatch(/NextResponse\.redirect\(decision\.redirect, 307\)/);
	});
});

describe('image-hosts.js (shared by next.config.js and proxy.ts)', () => {
	it('keeps the historical default host list', () => {
		expect(DEFAULT_IMAGE_HOSTS).toEqual([
			'dummyimage.com',
			'res.cloudinary.com',
			'gauzy.sfo2.digitaloceanspaces.com',
			'cdn-icons-png.flaticon.com',
			'api.gauzy.co',
			'apida.gauzy.co',
			'apicw.gauzy.co',
			'apicivo.gauzy.co',
			'apidev.gauzy.co',
			'apidemo.gauzy.co',
			'apidemocw.gauzy.co',
			'apidemodt.gauzy.co',
			'apidemodts.gauzy.co',
			'apidemocivo.gauzy.co',
			'apidemoda.gauzy.co',
			'apistage.gauzy.co',
			'apistagecivo.gauzy.co',
			'apistagecw.gauzy.co',
			'apistageda.gauzy.co',
			'apistagedt.gauzy.co',
			'apistagedts.gauzy.co',
			'api.ever.team',
			'app.ever.team',
			'apidev.ever.team',
			'gauzy.s3.wasabisys.com',
			'gauzystage.s3.wasabisys.com'
		]);
	});

	it('parses NEXT_PUBLIC_IMAGES_HOSTS exactly as next.config.js always did', () => {
		expect(parseImageHosts(undefined)).toEqual(DEFAULT_IMAGE_HOSTS);
		expect(parseImageHosts('')).toEqual(DEFAULT_IMAGE_HOSTS);
		expect(parseImageHosts(' a.example , b.example')).toEqual(['a.example', 'b.example']);
		// Empty entries were never dropped; keep that (the build-time remotePatterns must not change).
		expect(parseImageHosts('a.example,,b.example')).toEqual(['a.example', '', 'b.example']);
	});

	it('does not let callers mutate the defaults', () => {
		parseImageHosts(undefined).push('mutated.example');
		expect(DEFAULT_IMAGE_HOSTS).not.toContain('mutated.example');
	});

	it('serializes remotePatterns for runtime code', () => {
		expect(
			serializeImageRemotePatterns([
				{ protocol: 'http', hostname: '127.0.0.1', port: '3000' },
				{ protocol: 'https', hostname: 'api.ever.team', port: '' },
				{ protocol: 'https', hostname: '*.cdn.example', port: '' }
			])
		).toBe('http://127.0.0.1:3000,api.ever.team,*.cdn.example');
	});
});

describe('next.config.js image wiring', () => {
	const nextConfig = readFileSync(resolve(WEB_ROOT, 'next.config.js'), 'utf8');

	it('builds remotePatterns from image-hosts.js and exposes them to runtime code', () => {
		expect(nextConfig).toContain("require('./image-hosts')");
		expect(nextConfig).toContain('parseImageHosts(process.env.NEXT_PUBLIC_IMAGES_HOSTS)');
		expect(nextConfig).toMatch(/remotePatterns: imageRemotePatterns\b/);
		expect(nextConfig).toMatch(
			/EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS: serializeImageRemotePatterns\(imageRemotePatterns\),/
		);
	});

	it('keeps the markers .scripts/verify-branding-config.js checks for', () => {
		expect(nextConfig).toContain('parseImagesHosts');
		expect(nextConfig).toContain('allowedImageHosts');
		expect(nextConfig).toContain('NEXT_PUBLIC_IMAGES_HOSTS');
	});
});
