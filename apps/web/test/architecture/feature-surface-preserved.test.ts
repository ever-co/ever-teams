import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Violation = {
	category: string;
	kind: string;
	value: string;
};

type Surface = Record<string, string[]>;

type PreservationReport = {
	base: { surface: Surface };
	head: { surface: Surface };
	ok: boolean;
	violations: Violation[];
};

type CliResult = {
	report?: PreservationReport;
	status: number;
	stderr: string;
	stdout: string;
};

const REPOSITORY_ROOT = resolve(__dirname, '../../../..');
const SCRIPT = resolve(REPOSITORY_ROOT, 'tools/preservation/ever-teams-surface.mjs');

function git(repository: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function write(repository: string, path: string, contents: string): void {
	const destination = join(repository, path);
	mkdirSync(resolve(destination, '..'), { recursive: true });
	writeFileSync(destination, contents, 'utf8');
}

function checkedSpawn(result: SpawnSyncReturns<string>): SpawnSyncReturns<string> & { status: number } {
	if (result.error) throw result.error;
	if (result.status === null) throw new Error(`Child process ended without an exit status: ${result.signal}`);
	return result as SpawnSyncReturns<string> & { status: number };
}

function runCli(repository: string, base: string, head: string, allow = '[]', name = 'report.json'): CliResult {
	const output = join(repository, name);
	if (existsSync(output)) rmSync(output);
	const result = checkedSpawn(
		spawnSync(
			process.execPath,
			[SCRIPT, `--base=${base}`, `--head=${head}`, `--allow=${allow}`, `--out=${output}`],
			{ cwd: repository, encoding: 'utf8' }
		)
	);
	return {
		report: existsSync(output) ? (JSON.parse(readFileSync(output, 'utf8')) as PreservationReport) : undefined,
		status: result.status,
		stderr: result.stderr,
		stdout: result.stdout
	};
}

function createSyntheticHistory(): { base: string; head: string; repository: string } {
	const repository = mkdtempSync(join(tmpdir(), 'ever-teams-preservation-'));
	git(repository, 'init', '--quiet');
	git(repository, 'config', 'user.email', 'preservation-test@example.invalid');
	git(repository, 'config', 'user.name', 'Preservation Test');

	write(repository, 'apps/web/app/page.tsx', 'export default function RootPage() { return null; }\n');
	write(repository, 'apps/web/app/layout.tsx', 'export default function RootLayout() { return null; }\n');
	write(repository, 'apps/web/app/account/page.tsx', 'export default function AccountPage() { return null; }\n');
	write(
		repository,
		'apps/web/core/navigation.tsx',
		[
			"export const links = [<a href='/same' />, <a href='/same' />, <a href='/a' />, <a href='/z' />, <a href='/ä' />];",
			'export const api = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_API_URL];'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/public/index.ts',
		[
			"export { default } from './account-feature';",
			"export { default as AccountFeature, type AccountType, helper as renamedHelper } from './account-feature';",
			"export * as AccountNamespace from './account-feature';",
			"export * from './extra';",
			"export type { ExtraType } from './extra';",
			'export default function PublicDefault() {}',
			'export const directExport = true;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/public/account-feature.ts',
		'export default true; export type AccountType = {};\n'
	);
	write(repository, 'apps/web/core/public/extra.ts', 'export const extra = true; export type ExtraType = {};\n');
	write(
		repository,
		'apps/web/core/services/account.service.ts',
		[
			'export class AccountService {',
			'\tconstructor() {}',
			'\tpublic createAccount: ({ name }: { name: string }) => Promise<void> = async (',
			'\t\t{ name }: { name: string }',
			'\t): Promise<void> => { void name; };',
			'\tgetAccount(',
			'\t\tid: string',
			'\t): string { return id; }',
			'\tpublic lookupAccount = function (',
			'\t\t{ id }: { id: string }',
			'\t): string { return id; };',
			'\tprivate hiddenAccount() {}',
			'\tprotected guardedAccount = async () => undefined;',
			'}'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/account.cy.ts',
		[
			"describe.each([{ name: 'one' }])('account $name', () => {",
			"\tit.each([1])('loads %s', () => undefined);",
			"\ttest.concurrent.each([1])('parallel %s', () => undefined);",
			"\tit('legacy %s', () => undefined);",
			'});',
			`const fixture = "test.skip('fixture is not a test')";`,
			"// describe.only('comment is not a test', () => undefined);",
			'void fixture;'
		].join('\n') + '\n'
	);
	write(repository, 'apps/web/core/account.e2e.ts', "test('e2e account', () => undefined);\n");
	write(
		repository,
		'apps/web/project.json',
		JSON.stringify(
			{
				name: 'web',
				targets: {
					test: {
						executor: '@nx/jest:jest',
						options: { jestConfig: 'apps/web/jest.config.ts', passWithNoTests: true }
					}
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'apps/web/jest.config.ts',
		[
			'const config = {',
			"\ttestMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.cy.ts', '<rootDir>/**/*.e2e.ts'],",
			"\ttestRegex: ['.*\\\\.spec\\\\.ts$'],",
			"\troots: ['<rootDir>/core'],",
			"\ttestPathIgnorePatterns: ['/node_modules/']",
			'};',
			'export default config;'
		].join('\n') + '\n'
	);
	git(repository, 'add', '.');
	git(repository, 'commit', '--quiet', '-m', 'synthetic base');
	const base = git(repository, 'rev-parse', 'HEAD');

	git(repository, 'rm', '--quiet', 'apps/web/app/page.tsx', 'apps/web/app/layout.tsx');
	write(
		repository,
		'apps/web/core/navigation.tsx',
		[
			"export const links = [<a href='/same' />, <a href='/a' />, <a href='/z' />, <a href='/ä' />];",
			'export const api = [process.env.NEXT_PUBLIC_API_URL];'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/public/index.ts',
		"export { default as AccountFeature } from './account-feature';\n"
	);
	write(
		repository,
		'apps/web/core/services/account.service.ts',
		[
			'export class AccountService {',
			'\tconstructor() {}',
			'\tgetAccount(id: string): string { return id; }',
			'\tprivate hiddenAccount() {}',
			'}'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/account.cy.ts',
		[
			"describe.skip.each([{ name: 'one' }])('account $name', () => {",
			"\tit.skip.each([1])('loads %s', () => undefined);",
			"\ttest.concurrent.only.each([1])('parallel %s', () => undefined);",
			"\txit('legacy %s', () => undefined);",
			'});',
			`const fixture = "test.skip('fixture is not a test')";`,
			"// describe.only('comment is not a test', () => undefined);",
			'void fixture;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/project.json',
		JSON.stringify(
			{
				name: 'web',
				targets: {
					test: {
						executor: 'nx:run-commands',
						options: { jestConfig: 'apps/web/other-jest.config.ts', passWithNoTests: true }
					}
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'apps/web/jest.config.ts',
		[
			'const config = {',
			"\ttestMatch: ['<rootDir>/**/*.test.ts'],",
			"\ttestRegex: ['.*\\\\.spec\\\\.ts$'],",
			"\troots: ['<rootDir>/core'],",
			"\ttestPathIgnorePatterns: ['/node_modules/', '/architecture/']",
			'};',
			'export default config;'
		].join('\n') + '\n'
	);
	git(repository, 'add', '.');
	git(repository, 'commit', '--quiet', '-m', 'synthetic regression');

	return { base, head: git(repository, 'rev-parse', 'HEAD'), repository };
}

function collectRealHeadSurface(): Surface {
	const expression = [
		`import { collectSurface } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};`,
		`const result = collectSurface('HEAD', { cwd: ${JSON.stringify(REPOSITORY_ROOT)} });`,
		'process.stdout.write(JSON.stringify(result.surface));'
	].join('\n');
	const result = checkedSpawn(
		spawnSync(process.execPath, ['--input-type=module', '--eval', expression], { encoding: 'utf8' })
	);
	if (result.status !== 0) throw new Error(result.stderr);
	return JSON.parse(result.stdout) as Surface;
}

describe('Ever Teams feature surface preservation', () => {
	let fixture: ReturnType<typeof createSyntheticHistory>;
	let violationRun: CliResult;

	beforeAll(() => {
		fixture = createSyntheticHistory();
		violationRun = runCli(fixture.repository, fixture.base, fixture.head);
	});

	afterAll(() => {
		rmSync(fixture.repository, { recursive: true, force: true });
	});

	it('exits 1, writes evidence, and reports violations on stderr', () => {
		expect(violationRun.status).toBe(1);
		expect(violationRun.stderr).toContain('feature preservation failed');
		expect(violationRun.report?.ok).toBe(false);
		expect(violationRun.report?.violations.length).toBeGreaterThan(0);
	});

	it('protects root and nested App Router pages and layouts', () => {
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{ category: 'routes', kind: 'removed', value: 'apps/web/app/page.tsx' },
				{ category: 'routes', kind: 'removed', value: 'apps/web/app/layout.tsx' }
			])
		);
		expect(violationRun.report?.base.surface.routes).toContain('apps/web/app/account/page.tsx');
	});

	it('collects public method declarations and typed arrow/function properties only', () => {
		expect(violationRun.report?.base.surface.serviceMethods).toEqual(
			expect.arrayContaining([
				'apps/web/core/services/account.service.ts::AccountService.createAccount',
				'apps/web/core/services/account.service.ts::AccountService.getAccount',
				'apps/web/core/services/account.service.ts::AccountService.lookupAccount'
			])
		);
		expect(violationRun.report?.base.surface.serviceMethods).not.toEqual(
			expect.arrayContaining([
				'apps/web/core/services/account.service.ts::AccountService.constructor',
				'apps/web/core/services/account.service.ts::AccountService.hiddenAccount',
				'apps/web/core/services/account.service.ts::AccountService.guardedAccount'
			])
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'serviceMethods',
			kind: 'removed',
			value: 'apps/web/core/services/account.service.ts::AccountService.createAccount'
		});
	});

	it('collects default, namespace, star, type, aliased, and declaration barrel exports', () => {
		expect(violationRun.report?.base.surface.publicExports).toEqual(
			expect.arrayContaining([
				'apps/web/core/public/index.ts::default',
				'apps/web/core/public/index.ts::AccountFeature',
				'apps/web/core/public/index.ts::AccountNamespace',
				'apps/web/core/public/index.ts::* from ./extra',
				'apps/web/core/public/index.ts::AccountType',
				'apps/web/core/public/index.ts::ExtraType',
				'apps/web/core/public/index.ts::renamedHelper',
				'apps/web/core/public/index.ts::directExport'
			])
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'apps/web/core/public/index.ts::AccountNamespace'
		});
	});

	it('finds cy/e2e tests and every skip/only chain without parsing strings or comments', () => {
		expect(violationRun.report?.base.surface.testNames).toEqual(
			expect.arrayContaining([
				'apps/web/core/account.cy.ts::account $name::#1',
				'apps/web/core/account.cy.ts::loads %s::#1',
				'apps/web/core/account.cy.ts::parallel %s::#1',
				'apps/web/core/account.e2e.ts::e2e account::#1'
			])
		);
		expect(violationRun.report?.head.surface.testMarkers).toEqual(
			expect.arrayContaining([
				'apps/web/core/account.cy.ts::describe.skip.each::account $name::#1',
				'apps/web/core/account.cy.ts::it.skip.each::loads %s::#1',
				'apps/web/core/account.cy.ts::test.concurrent.only.each::parallel %s::#1',
				'apps/web/core/account.cy.ts::xit::legacy %s::#1'
			])
		);
		expect(violationRun.report?.head.surface.testNames.join('\n')).not.toContain('fixture is not a test');
		expect(violationRun.report?.head.surface.testNames.join('\n')).not.toContain('comment is not a test');
	});

	it('protects effective Jest/Nx selection and wiring', () => {
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'apps/web/project.json::targets.test.executor=@nx/jest:jest'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'apps/web/project.json::targets.test.options.jestConfig=apps/web/jest.config.ts'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'apps/web/jest.config.ts::testMatch=<rootDir>/**/*.cy.ts'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/web/jest.config.ts::testPathIgnorePatterns=/architecture/'
				}
			])
		);
	});

	it('preserves duplicate href and NEXT_PUBLIC occurrences with stable ordinals', () => {
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'navigation',
					kind: 'removed',
					value: 'apps/web/core/navigation.tsx::href=/same::#2'
				},
				{
					category: 'nextPublicOccurrences',
					kind: 'removed',
					value: 'apps/web/core/navigation.tsx::NEXT_PUBLIC_API_URL::#2'
				}
			])
		);
	});

	it('uses deterministic code-point order rather than locale collation', () => {
		const navigation = violationRun.report?.base.surface.navigation.filter((value) => value.includes('::href=/'));
		expect(navigation).toEqual([
			'apps/web/core/navigation.tsx::href=/a::#1',
			'apps/web/core/navigation.tsx::href=/same::#1',
			'apps/web/core/navigation.tsx::href=/same::#2',
			'apps/web/core/navigation.tsx::href=/z::#1',
			'apps/web/core/navigation.tsx::href=/ä::#1'
		]);
	});

	it('exits 0 for both a clean comparison and a fully allowed comparison', () => {
		const clean = runCli(fixture.repository, fixture.base, fixture.base, '[]', 'clean.json');
		expect(clean.status).toBe(0);
		expect(clean.stderr).toBe('');
		expect(clean.stdout).toContain('feature preservation passed');
		expect(clean.report).toEqual(expect.objectContaining({ ok: true, violations: [] }));

		const allow = JSON.stringify(
			violationRun.report?.violations.map(({ category, kind, value }) => `${kind}:${category}:${value}`)
		);
		const allowed = runCli(fixture.repository, fixture.base, fixture.head, allow, 'allowed.json');
		expect(allowed.status).toBe(0);
		expect(allowed.stderr).toBe('');
		expect(allowed.report).toEqual(expect.objectContaining({ ok: true, violations: [] }));
	});

	it('refuses HEAD when tracked index or worktree changes would be ignored', () => {
		write(fixture.repository, 'apps/web/core/services/account.service.ts', 'export class DirtyService {}\n');
		const dirty = runCli(fixture.repository, 'HEAD', 'HEAD', '[]', 'dirty.json');
		expect(dirty.status).toBe(2);
		expect(dirty.stderr).toContain('Refusing --head=HEAD because tracked changes differ from HEAD');
		expect(dirty.report).toBeUndefined();
	});

	it('covers the concrete typed service methods from the real repository', () => {
		const surface = collectRealHeadSurface();
		expect(surface.serviceMethods).toEqual(
			expect.arrayContaining([
				'apps/web/core/services/client/api/tasks/task.service.ts::TaskService.createTask',
				'apps/web/core/services/client/api/tasks/task.service.ts::TaskService.getTasks',
				'apps/web/core/services/client/api/activities/activity.service.ts::ActivityService.getActivities',
				'apps/web/core/services/client/api/currencies/currency.service.ts::CurrencyService.getCurrencies'
			])
		);
		expect(surface.serviceMethods.length).toBeGreaterThanOrEqual(263);
	});
});
