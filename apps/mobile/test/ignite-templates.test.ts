import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const mobile = join(__dirname, '..');

function filesIn(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		if (statSync(path).isDirectory()) {
			return filesIn(path);
		}
		return [path];
	});
}

describe('the generator templates', () => {
	it('import only packages the app installs', () => {
		const manifest = JSON.parse(readFileSync(join(mobile, 'package.json'), 'utf8'));
		const installed = new Set([
			...Object.keys(manifest.dependencies ?? {}),
			...Object.keys(manifest.devDependencies ?? {})
		]);
		const templates = filesIn(join(mobile, 'ignite/templates')).filter((path) => path.endsWith('.ejs'));
		const missing: string[] = [];

		for (const template of templates) {
			const source = readFileSync(template, 'utf8');
			for (const [, specifier] of source.matchAll(/from ["']([^"'.][^"']*)["']/g)) {
				const parts = specifier.split('/');
				const scoped = specifier.startsWith('@');
				const packageName = scoped ? parts.slice(0, 2).join('/') : parts[0];
				if (!installed.has(packageName)) {
					missing.push(`${template.slice(mobile.length + 1)}: ${packageName}`);
				}
			}
		}

		expect(templates.length).toBeGreaterThan(0);
		expect(missing).toEqual([]);
	});
});
