import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type Violation = {
	category: string;
	kind: string;
	value: string;
};

type PreservationReport = {
	violations: Violation[];
};

const SCRIPT = resolve(__dirname, '../../../../tools/preservation/ever-teams-surface.mjs');

function git(repository: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function write(repository: string, path: string, contents: string): void {
	const destination = join(repository, path);
	mkdirSync(resolve(destination, '..'), { recursive: true });
	writeFileSync(destination, contents, 'utf8');
}

function createSyntheticHistory(): { base: string; head: string; repository: string } {
	const repository = mkdtempSync(join(tmpdir(), 'ever-teams-preservation-'));
	git(repository, 'init', '--quiet');
	git(repository, 'config', 'user.email', 'preservation-test@example.invalid');
	git(repository, 'config', 'user.name', 'Preservation Test');

	write(repository, 'apps/web/app/account/page.tsx', 'export default function AccountPage() { return null; }\n');
	write(repository, 'apps/web/core/public/index.ts', "export { accountFeature } from './account-feature';\n");
	write(repository, 'apps/web/core/public/account-feature.ts', 'export const accountFeature = true;\n');
	write(
		repository,
		'apps/web/core/services/account.service.ts',
		'export class AccountService {\n\tgetAccount() { return null; }\n\tupdateAccount() { return null; }\n}\n'
	);
	write(
		repository,
		'apps/web/core/account.test.ts',
		"describe('account', () => {\n\tit('loads details', () => undefined);\n});\n"
	);
	git(repository, 'add', '.');
	git(repository, 'commit', '--quiet', '-m', 'synthetic base');
	const base = git(repository, 'rev-parse', 'HEAD');

	git(repository, 'rm', '--quiet', 'apps/web/app/account/page.tsx');
	write(repository, 'apps/web/core/public/index.ts', 'export {};\n');
	write(
		repository,
		'apps/web/core/services/account.service.ts',
		'export class AccountService {\n\tupdateAccount() { return null; }\n}\n'
	);
	write(
		repository,
		'apps/web/core/account.test.ts',
		"describe('account', () => {\n\tit.skip('loads details', () => undefined);\n});\n"
	);
	git(repository, 'add', '.');
	git(repository, 'commit', '--quiet', '-m', 'synthetic regression');

	return { base, head: git(repository, 'rev-parse', 'HEAD'), repository };
}

describe('Ever Teams feature surface preservation', () => {
	let fixture: ReturnType<typeof createSyntheticHistory>;
	let report: PreservationReport;

	beforeAll(() => {
		fixture = createSyntheticHistory();
		const output = join(fixture.repository, 'preservation-report.json');
		spawnSync(
			process.execPath,
			[SCRIPT, `--base=${fixture.base}`, `--head=${fixture.head}`, '--allow=[]', `--out=${output}`],
			{ cwd: fixture.repository, encoding: 'utf8' }
		);
		report = (() => {
			try {
				return JSON.parse(readFileSync(output, 'utf8')) as PreservationReport;
			} catch {
				return { violations: [] };
			}
		})();
	});

	afterAll(() => {
		rmSync(fixture.repository, { recursive: true, force: true });
	});

	it('reports a removed App Router route', () => {
		expect(report.violations).toContainEqual({
			category: 'routes',
			kind: 'removed',
			value: 'apps/web/app/account/page.tsx'
		});
	});

	it('reports a removed public barrel export', () => {
		expect(report.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'apps/web/core/public/index.ts::accountFeature'
		});
	});

	it('reports a removed API service method', () => {
		expect(report.violations).toContainEqual({
			category: 'serviceMethods',
			kind: 'removed',
			value: 'apps/web/core/services/account.service.ts::AccountService.getAccount'
		});
	});

	it('reports when an existing test is skipped', () => {
		expect(report.violations).toContainEqual({
			category: 'testMarkers',
			kind: 'added',
			value: 'apps/web/core/account.test.ts::it.skip::loads details'
		});
	});
});
