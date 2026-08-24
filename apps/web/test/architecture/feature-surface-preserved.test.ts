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
		'apps/web/.env.local',
		'NEXT_PUBLIC_SUFFIXED_ENV_RETAINED=true\nNEXT_PUBLIC_SUFFIXED_ENV_REMOVED=true\n'
	);
	write(
		repository,
		'apps/web/app/api/sample/route.ts',
		[
			'const load = async () => undefined;',
			'export { load as GET };',
			'export async function POST() { return undefined; }',
			'export const PUT = async () => undefined;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/navigation.tsx',
		[
			"export const links = [<a href='/same' />, <a href='/same' />, <a href='/a' />, <a href='/z' />, <a href='/ä' />];",
			"export const menu = [{ href: '/object' }];",
			"export const ACCOUNT_ROUTE = '/account';",
			"export const SETTINGS_PATH = '/settings';",
			'export const api = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_API_URL];',
			'export const assets = import.meta.env.NEXT_PUBLIC_ASSET_URL;',
			'const { NEXT_PUBLIC_DESTRUCTURED, NEXT_PUBLIC_DUPLICATE: processDuplicate } = process.env;',
			'const { NEXT_PUBLIC_IMPORT_ALIAS: importAlias, NEXT_PUBLIC_DUPLICATE: importDuplicate } = import.meta.env;',
			`const fixture = "<a href='/fake-href' /> process.env.NEXT_PUBLIC_FAKE";`,
			"// const commented = { href: '/comment-href', env: process.env.NEXT_PUBLIC_COMMENT };",
			'void fixture; void NEXT_PUBLIC_DESTRUCTURED; void processDuplicate; void importAlias; void importDuplicate;'
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
			"export * from './middle';",
			'export default function PublicDefault() {}',
			'export const directExport = true;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/public/account-feature.ts',
		'export default true; export const helper = true; export type AccountType = {};\n'
	);
	write(repository, 'apps/web/core/public/extra.ts', 'export const extra = true; export type ExtraType = {};\n');
	write(repository, 'apps/web/core/public/middle.ts', "export * from './leaf'; export * from './cycle';\n");
	write(
		repository,
		'apps/web/core/public/leaf.ts',
		[
			'export const LeafRuntime = true;',
			'export const RuntimeToType = true;',
			'export type LeafType = { value: string };',
			'const PrivateLeaf = true;',
			'void PrivateLeaf;'
		].join('\n') + '\n'
	);
	write(repository, 'apps/web/core/public/cycle.ts', "export * from './middle'; export const CycleRuntime = true;\n");
	write(repository, 'packages/contracts/index.d.ts', "export * from './leaf.js';\n");
	write(repository, 'packages/contracts/leaf.d.ts', 'export interface DeclaredOnly { value: string }\n');
	write(repository, 'packages/contracts-mts/index.d.mts', "export * from './leaf.mjs';\n");
	write(repository, 'packages/contracts-mts/leaf.d.mts', 'export type DeclaredMts = string;\n');
	write(repository, 'packages/contracts-cts/index.d.cts', "export * from './leaf.cjs';\n");
	write(repository, 'packages/contracts-cts/leaf.d.cts', 'export type DeclaredCts = string;\n');
	write(repository, 'packages/ambiguous/index.ts', "export * from './a'; export * from './b';\n");
	write(repository, 'packages/ambiguous/a.ts', 'export const SharedName = true; export const OnlyA = true;\n');
	write(repository, 'packages/ambiguous/b.ts', 'export const OnlyB = true;\n');
	write(repository, 'packages/shared-leaf.ts', 'export const SharedBinding = true;\n');
	write(repository, 'packages/same-binding/index.ts', "export * from './left'; export * from './right';\n");
	write(
		repository,
		'packages/same-binding/left.ts',
		"export { SharedBinding as SharedSame } from '../shared-leaf';\n"
	);
	write(
		repository,
		'packages/same-binding/right.ts',
		"export { SharedBinding as SharedSame } from '../shared-leaf';\n"
	);
	write(repository, 'packages/type-star/index.ts', "export type * from './leaf';\n");
	write(
		repository,
		'packages/type-star/leaf.ts',
		[
			'export const RuntimeOnly = true;',
			'export interface TypeOnly { value: string }',
			'export class RuntimeAndTypeClass {}',
			'export enum RuntimeAndTypeEnum { Value }'
		].join('\n') + '\n'
	);
	write(
		repository,
		'packages/imported/index.ts',
		[
			"import DefaultThing, { NamedThing as LocalNamed, type TypeThing as LocalType } from './leaf';",
			"import * as ThingNamespace from './namespace';",
			'export { DefaultThing as ImportedDefault, LocalNamed as ImportedNamed, LocalType as ImportedType, ThingNamespace };',
			"export * from './star-a';",
			"export * from './star-b';"
		].join('\n') + '\n'
	);
	write(
		repository,
		'packages/imported/leaf.ts',
		'export default function DefaultThing() {} export const NamedThing = true; export interface TypeThing { value: string }\n'
	);
	write(repository, 'packages/imported/namespace.ts', 'export const NamespaceValue = true;\n');
	write(
		repository,
		'packages/imported/star-a.ts',
		"export const ImportedNamed = 'star'; export const StarOnly = true;\n"
	);
	write(repository, 'packages/imported/star-b.ts', 'export const OtherStar = true;\n');
	write(repository, 'packages/cross-kind/index.ts', "export * from './runtime'; export * from './types';\n");
	write(repository, 'packages/cross-kind/runtime.ts', 'export const CrossKind = true;\n');
	write(repository, 'packages/cross-kind/types.ts', 'export interface OtherType { value: string }\n');
	write(repository, 'packages/shared-class.ts', 'export class SharedClass {}\n');
	write(repository, 'packages/same-class/index.ts', "export * from './left'; export * from './right';\n");
	write(repository, 'packages/same-class/left.ts', "export { SharedClass } from '../shared-class';\n");
	write(repository, 'packages/same-class/right.ts', "export { SharedClass } from '../shared-class';\n");
	write(
		repository,
		'apps/web/core/components/overlays.tsx',
		[
			'export const DialogTrigger = () => null;',
			'export function DialogContent() { return null; }',
			'const DrawerTrigger = () => null;',
			'export { DrawerTrigger };',
			`const fixture = 'FakeModal in a string';`,
			'// function CommentDrawer() {}',
			'void fixture;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/components/anonymous-modal.tsx',
		'export default function Surface() { return null; }\n'
	);
	write(
		repository,
		'apps/web/core/components/overlay-identities.tsx',
		[
			'type DialogState = { open: boolean };',
			'const DialogOpen = false;',
			'const InternalModal = () => null;',
			'const CommandDialog = () => null;',
			'const StoredDrawer = { open: () => undefined };',
			'export { CommandDialog, CommandDialog as QuickDialog, StoredDrawer as ExportedDrawer };',
			'export default CommandDialog;',
			'void DialogOpen;'
		].join('\n') + '\n'
	);
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
		'apps/web/core/services/requests/callables.ts',
		[
			'export function directRequest() {}',
			'export default function defaultRequest() {}',
			'export const arrowRequest = () => undefined;',
			'const localRequest = function () {};',
			'const aliasedRequest = () => undefined;',
			'const serviceObject = { getThing() {}, postThing: async () => undefined, state: true };',
			'export { localRequest, aliasedRequest as renamedRequest, serviceObject as RequestService };',
			'export const InlineService = { deleteThing() {}, patchThing: () => undefined, state: false };'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/task-status.service.ts',
		[
			'export class TaskStatusService { getTaskStatuses() { return []; } }',
			'export const taskStatusService = new TaskStatusService();',
			'const taskPriorityService = new TaskStatusService();',
			'export { taskPriorityService as metadataService };'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/aliased-task.service.ts',
		[
			'export class AliasedTaskService { getTasks() { return []; } }',
			'const primary = new AliasedTaskService();',
			'const alias = primary;',
			'export { alias as outwardTaskService };'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/source.service.ts',
		[
			'export class SourceService { getSource() { return []; } }',
			'export const sourceService = new SourceService();'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/metadata.service.ts',
		"export { sourceService as outwardMetadataService } from './source.service';\n"
	);
	write(
		repository,
		'apps/web/core/account.cy.ts',
		[
			"describe.each([{ name: 'one' }])('account $name', () => {",
			"\tit.each([1])('loads %s', () => undefined);",
			"\ttest.concurrent.each([1])('parallel %s', () => undefined);",
			"\tit.each`value`('tagged loads %s', () => undefined);",
			"\ttest.concurrent.each`value`('tagged parallel %s', () => undefined);",
			"\tit('legacy %s', () => undefined);",
			'});',
			"describe.each`value`('tagged account %s', () => undefined);",
			`const fixture = "test.skip('fixture is not a test')";`,
			"// describe.only('comment is not a test', () => undefined);",
			'void fixture;'
		].join('\n') + '\n'
	);
	write(repository, 'apps/web/core/account.e2e.ts', "test('e2e account', () => undefined);\n");
	write(
		repository,
		'apps/web/core/aliases.test.ts',
		[
			"import { test as check, describe as suite } from '@jest/globals';",
			"import * as jestGlobals from '@jest/globals';",
			'const local = check;',
			"check('named alias', () => undefined);",
			"jestGlobals.test('namespace alias', () => undefined);",
			"local('local alias', () => undefined);",
			"suite('aliased suite', () => undefined);"
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/imperative-navigation.ts',
		[
			'const env = process.env;',
			'const publicEnv = env;',
			'const metaEnv = import.meta.env;',
			'const aliasUses = [publicEnv.NEXT_PUBLIC_ALIAS_URL, metaEnv.NEXT_PUBLIC_META_ALIAS_URL];',
			'const { NEXT_PUBLIC_ALIAS_DESTRUCTURED } = publicEnv;',
			"router.push('/imperative');",
			"navigation.replace('/replace');",
			"redirect('/redirect');",
			'permanentRedirect(dynamicDestination);',
			"location.assign('/assign');",
			'window.location.replace(dynamicDestination);',
			"const items = ['/not-navigation'];",
			"items.push('/still-not-navigation');",
			'void aliasUses; void NEXT_PUBLIC_ALIAS_DESTRUCTURED;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'nx.json',
		JSON.stringify(
			{
				targetDefaults: {
					test: {
						executor: '@nx/jest:jest',
						options: {
							roots: ['apps/web'],
							testPathPattern: ['apps/web'],
							testFile: 'apps/web/all.test.ts'
						}
					},
					'@nx/jest:jest': {
						options: {
							testNamePattern: 'preserved',
							findRelatedTests: 'apps/web/core/base.ts',
							onlyChanged: false,
							changedSince: 'main',
							watch: false
						}
					},
					unit: {
						options: {
							jestConfig: 'apps/web/jest.config.ts',
							testRegex: 'unit\\.test\\.ts$'
						}
					}
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'apps/web/project.json',
		JSON.stringify(
			{
				name: 'web',
				targets: {
					test: {
						executor: '@nx/jest:jest',
						options: {
							jestConfig: 'apps/web/jest.config.ts',
							passWithNoTests: false,
							testFile: 'apps/web/all.test.ts',
							findRelatedTests: 'apps/web/core/base.ts',
							onlyChanged: false,
							changedSince: 'main',
							watch: false
						}
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
			"const TEST_MATCH = ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.cy.ts', '<rootDir>/**/*.e2e.ts'];",
			"const TEST_REGEX = ['.*\\\\.spec\\\\.ts$'];",
			"const ROOTS = ['<rootDir>/core'];",
			"const IGNORES = ['/node_modules/'];",
			'const BASE_SELECTION = { testMatch: TEST_MATCH, testRegex: TEST_REGEX };',
			'const config = { ...BASE_SELECTION };',
			'config.roots = ROOTS;',
			'config.testPathIgnorePatterns = IGNORES;',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/secondary/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts'] };",
			"const effective = { ...config, testPathIgnorePatterns: ['/generated/'] };",
			'export default effective;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/common/jest.config.js',
		[
			"const selection = { testRegex: ['.*\\\\.test\\\\.js$'] };",
			'module.exports = { ...selection };',
			"module.exports.testPathIgnorePatterns = ['/node_modules/'];"
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/exports/jest.config.js',
		["exports.testMatch = ['<rootDir>/**/*.spec.js'];", "exports.testPathIgnorePatterns = ['/vendor/'];"].join(
			'\n'
		) + '\n'
	);
	write(
		repository,
		'apps/assign-esm/jest.config.ts',
		[
			"const selection = { testMatch: ['<rootDir>/**/*.test.ts'] };",
			"const ignored = { testPathIgnorePatterns: ['/generated/'] };",
			'export default Object.assign({}, selection, ignored);'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/assign-cjs/jest.config.js',
		[
			"const selection = { testRegex: ['.*\\\\.spec\\\\.js$'] };",
			"const ignored = { testPathIgnorePatterns: ['/vendor/'] };",
			'module.exports = Object.assign({}, selection, ignored);'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/unknown-esm/jest.config.ts',
		"export default mysteryConfig({ testMatch: ['<rootDir>/**/*.test.ts'] });\n"
	);
	write(
		repository,
		'apps/unknown-cjs/jest.config.js',
		"module.exports = unknownFactory({ roots: ['<rootDir>'] });\n"
	);
	write(
		repository,
		'apps/mutating/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'], testPathIgnorePatterns: ['/node_modules/'] };",
			"config.testPathIgnorePatterns.push('/generated/');",
			'if (process.env.CI) { config.testMatch.splice(1, 1); }',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/function/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] };",
			'function resolveConfig() {',
			"\tconfig.testMatch = ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'];",
			'\treturn config;',
			'}',
			'resolveConfig();',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/conditional/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] };",
			"if (process.env.CI) config.testMatch = ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'];",
			'config.onlyChanged = false;',
			'config.passWithNoTests = false;',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/projects/jest.config.ts',
		"export default { projects: [{ testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] }] };\n"
	);
	write(
		repository,
		'apps/function-return/jest.config.ts',
		[
			'function makeConfig() {',
			"\treturn { projects: [{ testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] }] };",
			'}',
			'export default makeConfig();'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/directional-mutation/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] };",
			"if (process.env.CI) config.testMatch = ['<rootDir>/**/*.test.ts'];",
			'config.onlyChanged = true;',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/dynamic/jest.config.ts',
		["const config = { testMatch: ['<rootDir>/**/*.test.ts'] };", 'export default async () => config;'].join('\n') +
			'\n'
	);
	write(
		repository,
		'apps/wrapped/jest.config.js',
		["const config = { roots: ['<rootDir>'] };", 'module.exports = wrap(config);'].join('\n') + '\n'
	);
	write(
		repository,
		'apps/config-package/package.json',
		JSON.stringify(
			{
				name: 'config-package',
				jest: {
					testMatch: ['<rootDir>/**/*.test.ts'],
					testPathIgnorePatterns: ['/generated/']
				}
			},
			null,
			2
		) + '\n'
	);
	write(repository, 'apps/unit/jest.config.ts', "export default { roots: ['<rootDir>'] };\n");
	write(
		repository,
		'apps/unit/project.json',
		JSON.stringify(
			{
				name: 'unit',
				targets: {
					unit: {
						executor: '@nx/jest:jest',
						options: { jestConfig: 'apps/unit/jest.config.ts', roots: ['apps/unit'] }
					}
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'workspace.json',
		JSON.stringify(
			{
				projects: {
					other: {
						targets: {
							test: {
								executor: '@nx/jest:jest',
								options: {
									roots: ['apps/other'],
									onlyChanged: true,
									watch: true,
									passWithNoTests: true
								}
							}
						}
					}
				}
			},
			null,
			2
		) + '\n'
	);
	git(repository, 'add', '.');
	git(repository, 'commit', '--quiet', '-m', 'synthetic base');
	const base = git(repository, 'rev-parse', 'HEAD');

	write(repository, 'apps/web/.env.local', 'NEXT_PUBLIC_SUFFIXED_ENV_RETAINED=true\n');
	git(
		repository,
		'rm',
		'--quiet',
		'apps/web/app/page.tsx',
		'apps/web/app/layout.tsx',
		'apps/web/core/components/anonymous-modal.tsx'
	);
	write(
		repository,
		'apps/web/app/api/sample/route.ts',
		[
			'const load = async () => undefined;',
			'export { load as GET };',
			'async function POST() { return undefined; }',
			'export const PUT = async () => undefined;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/navigation.tsx',
		[
			"export const links = [<a href='/same' />, <a href='/a' />, <a href='/z' />, <a href='/ä' />];",
			"export const menu = [{ href: '/object' }];",
			"export const ACCOUNT_ROUTE = '/account';",
			"export const SETTINGS_PATH = '/settings';",
			'export const api = [process.env.NEXT_PUBLIC_API_URL];',
			'export const assets = import.meta.env.NEXT_PUBLIC_ASSET_URL;',
			'const { NEXT_PUBLIC_DESTRUCTURED, NEXT_PUBLIC_DUPLICATE: processDuplicate } = process.env;',
			'const { NEXT_PUBLIC_IMPORT_ALIAS: importAlias } = import.meta.env;',
			`const fixture = "<a href='/fake-href' /> process.env.NEXT_PUBLIC_FAKE";`,
			"// const commented = { href: '/comment-href', env: process.env.NEXT_PUBLIC_COMMENT };",
			'void fixture; void NEXT_PUBLIC_DESTRUCTURED; void processDuplicate; void importAlias;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/imperative-navigation.ts',
		[
			'const env = process.env;',
			'const publicEnv = env;',
			'const metaEnv = import.meta.env;',
			'const aliasUses = [metaEnv.NEXT_PUBLIC_META_ALIAS_URL];',
			'const { NEXT_PUBLIC_ALIAS_DESTRUCTURED } = publicEnv;',
			"navigation.replace('/replace');",
			"redirect('/changed-redirect');",
			'permanentRedirect(dynamicDestination);',
			"location.assign('/assign');",
			'window.location.replace(dynamicDestination);',
			"const items = ['/not-navigation'];",
			"items.push('/still-not-navigation');",
			'void aliasUses; void NEXT_PUBLIC_ALIAS_DESTRUCTURED;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/public/index.ts',
		["export { default as AccountFeature } from './account-feature';", "export * from './middle';"].join('\n') +
			'\n'
	);
	write(
		repository,
		'apps/web/core/public/leaf.ts',
		[
			'export type RuntimeToType = { value: string };',
			'export type LeafType = { value: string };',
			'const PrivateLeaf = true;',
			'void PrivateLeaf;'
		].join('\n') + '\n'
	);
	write(repository, 'packages/contracts/leaf.d.ts', 'interface PrivateDeclaredOnly { value: string }\n');
	write(repository, 'packages/contracts-mts/leaf.d.mts', 'type PrivateDeclaredMts = string;\n');
	write(repository, 'packages/contracts-cts/leaf.d.cts', 'type PrivateDeclaredCts = string;\n');
	write(repository, 'packages/ambiguous/b.ts', 'export const OnlyB = true; export const SharedName = false;\n');
	write(
		repository,
		'packages/imported/index.ts',
		[
			"import DefaultThing, { NamedThing as LocalNamed, type TypeThing as LocalType } from './leaf';",
			"import * as ThingNamespace from './namespace';",
			'export { LocalNamed as ImportedNamed, LocalType as ImportedType, ThingNamespace };',
			"export * from './star-a';",
			"export * from './star-b';",
			'void DefaultThing;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'packages/imported/star-b.ts',
		'export const OtherStar = true; export const ImportedNamed = false;\n'
	);
	write(repository, 'packages/cross-kind/types.ts', 'export interface CrossKind { value: string }\n');
	write(
		repository,
		'packages/type-star/leaf.ts',
		[
			'export interface TypeOnly { value: string }',
			'export class RuntimeAndTypeClass {}',
			'export enum RuntimeAndTypeEnum { Value }'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/components/overlays.tsx',
		[
			'export const DialogTrigger = () => null;',
			'const DrawerTrigger = () => null;',
			'export { DrawerTrigger };',
			`const fixture = 'FakeModal in a string';`,
			'// function CommentDrawer() {}',
			'void fixture;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/components/overlay-identities.tsx',
		[
			'type DialogState = { open: boolean };',
			'const DialogOpen = false;',
			'const InternalModal = () => null;',
			'const CommandDialog = () => null;',
			'const StoredDrawer = { open: () => undefined };',
			'export { StoredDrawer as ExportedDrawer };',
			'void DialogOpen; void CommandDialog;'
		].join('\n') + '\n'
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
		'apps/web/core/services/requests/callables.ts',
		[
			'function directRequest() {}',
			'export default function defaultRequest() {}',
			'const arrowRequest = () => undefined;',
			'const localRequest = function () {};',
			'const aliasedRequest = () => undefined;',
			'const serviceObject = { getThing() {}, postThing: async () => undefined, state: true };',
			'export { localRequest, serviceObject as RequestService };',
			'export const InlineService = { deleteThing() {}, state: false };',
			'void directRequest; void arrowRequest; void aliasedRequest;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/task-status.service.ts',
		[
			'export class TaskStatusService { getTaskStatuses() { return []; } }',
			'const taskStatusService = new TaskStatusService();',
			'const taskPriorityService = new TaskStatusService();',
			'void taskStatusService; void taskPriorityService;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/aliased-task.service.ts',
		[
			'export class AliasedTaskService { getTasks() { return []; } }',
			'const primary = new AliasedTaskService();',
			'const alias = primary;',
			'void alias;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/services/client/api/tasks/metadata.service.ts',
		"export { sourceService } from './source.service';\n"
	);
	write(
		repository,
		'apps/web/core/account.cy.ts',
		[
			"describe.skip.each([{ name: 'one' }])('account $name', () => {",
			"\tit.skip.each([1])('loads %s', () => undefined);",
			"\ttest.concurrent.only.each([1])('parallel %s', () => undefined);",
			"\tit.skip.each`value`('tagged loads %s', () => undefined);",
			"\ttest.concurrent.only.each`value`('tagged parallel %s', () => undefined);",
			"\txit('legacy %s', () => undefined);",
			'});',
			"describe.only.each`value`('tagged account %s', () => undefined);",
			`const fixture = "test.skip('fixture is not a test')";`,
			"// describe.only('comment is not a test', () => undefined);",
			'void fixture;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/web/core/aliases.test.ts',
		[
			"import { test as check, describe as suite } from '@jest/globals';",
			"import * as jestGlobals from '@jest/globals';",
			'const local = check;',
			"check.skip('named alias', () => undefined);",
			"jestGlobals.test.todo('namespace alias');",
			"suite('aliased suite', () => undefined);",
			'void local;'
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
						options: {
							jestConfig: 'apps/web/other-jest.config.ts',
							passWithNoTests: true,
							findRelatedTests: 'apps/web/core/head.ts',
							onlyChanged: true,
							changedSince: 'develop',
							watch: true,
							config: '{"testMatch":["only"]}'
						}
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
			"const TEST_MATCH = ['<rootDir>/**/*.test.ts'];",
			"const TEST_REGEX = ['.*\\\\.spec\\\\.ts$'];",
			"const ROOTS = ['<rootDir>/core'];",
			"const IGNORES = ['/node_modules/', '/architecture/'];",
			'const BASE_SELECTION = { testMatch: TEST_MATCH, testRegex: TEST_REGEX };',
			'const config = { ...BASE_SELECTION };',
			'config.roots = ROOTS;',
			'config.testPathIgnorePatterns = IGNORES;',
			"config.testNamePattern = 'account';",
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/secondary/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts'] };",
			"const effective = { ...config, testPathIgnorePatterns: ['/generated/', '/architecture/'] };",
			'export default effective;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/common/jest.config.js',
		[
			"const selection = { testRegex: ['.*\\\\.test\\\\.js$'] };",
			'module.exports = { ...selection };',
			"module.exports.testPathIgnorePatterns = ['/node_modules/', '/legacy/'];"
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/exports/jest.config.js',
		[
			"exports.testMatch = ['<rootDir>/**/*.spec.js'];",
			"exports.testPathIgnorePatterns = ['/vendor/', '/skipped/'];"
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/assign-esm/jest.config.ts',
		[
			"const selection = { testMatch: ['<rootDir>/**/*.test.ts'] };",
			"const ignored = { testPathIgnorePatterns: ['/generated/', '/architecture/'] };",
			'export default Object.assign({}, selection, ignored);'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/assign-cjs/jest.config.js',
		[
			"const selection = { testRegex: ['.*\\\\.spec\\\\.js$'] };",
			"const ignored = { testPathIgnorePatterns: ['/vendor/', '/legacy/'] };",
			'module.exports = Object.assign({}, selection, ignored);'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/unknown-esm/jest.config.ts',
		"export default mysteryConfig({ testMatch: ['<rootDir>/only.test.ts'] });\n"
	);
	write(
		repository,
		'apps/unknown-cjs/jest.config.js',
		"module.exports = unknownFactory({ roots: ['<rootDir>/only'] });\n"
	);
	write(
		repository,
		'apps/mutating/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'], testPathIgnorePatterns: ['/node_modules/'] };",
			"config.testPathIgnorePatterns.push('/architecture/');",
			'if (process.env.CI) { config.testMatch.splice(0, 1); }',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/function/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] };",
			'function resolveConfig() {',
			"\tconfig.testMatch = ['<rootDir>/only.test.ts'];",
			'\treturn config;',
			'}',
			'resolveConfig();',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/conditional/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] };",
			"if (process.env.CI) config.testMatch = ['<rootDir>/only.test.ts'];",
			'config.onlyChanged = false;',
			'config.passWithNoTests = false;',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/projects/jest.config.ts',
		"export default { projects: [{ testMatch: ['<rootDir>/only.test.ts'] }] };\n"
	);
	write(
		repository,
		'apps/function-return/jest.config.ts',
		[
			'function makeConfig() {',
			"\treturn { projects: [{ testMatch: ['<rootDir>/**/*.test.ts'] }] };",
			'}',
			'export default makeConfig();'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/directional-mutation/jest.config.ts',
		[
			"const config = { testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.spec.ts'] };",
			"if (process.env.CI) config.testMatch = ['<rootDir>/**/*.test.ts'];",
			'config.onlyChanged = false;',
			'export default config;'
		].join('\n') + '\n'
	);
	write(
		repository,
		'apps/dynamic/jest.config.ts',
		["const config = { testMatch: ['<rootDir>/only.test.ts'] };", 'export default async () => config;'].join('\n') +
			'\n'
	);
	write(
		repository,
		'apps/wrapped/jest.config.js',
		["const config = { roots: ['<rootDir>/only'] };", 'module.exports = wrap(config);'].join('\n') + '\n'
	);
	write(
		repository,
		'apps/config-package/package.json',
		JSON.stringify(
			{
				name: 'config-package',
				jest: {
					testMatch: ['<rootDir>/**/*.test.ts'],
					testPathIgnorePatterns: ['/generated/', '/architecture/']
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'apps/unit/project.json',
		JSON.stringify(
			{
				name: 'unit',
				targets: {
					unit: {
						executor: '@nx/jest:jest',
						options: {
							jestConfig: 'apps/unit/jest.config.ts',
							roots: ['apps/unit/specs'],
							testPathIgnorePatterns: ['legacy']
						}
					}
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'workspace.json',
		JSON.stringify(
			{
				projects: {
					other: {
						targets: {
							test: {
								executor: '@nx/jest:jest',
								options: {
									roots: ['apps/other'],
									onlyChanged: false,
									watch: false,
									passWithNoTests: false
								}
							}
						}
					}
				}
			},
			null,
			2
		) + '\n'
	);
	write(
		repository,
		'nx.json',
		JSON.stringify(
			{
				targetDefaults: {
					test: {
						executor: '@nx/jest:jest',
						options: {
							roots: ['apps/web/core'],
							testPathPattern: ['apps/web/core'],
							testPathIgnorePatterns: ['architecture'],
							watch: true
						}
					},
					'@nx/jest:jest': {
						options: {
							testNamePattern: 'account',
							findRelatedTests: 'apps/web/core/head.ts',
							onlyChanged: true,
							changedSince: 'develop'
						}
					}
				}
			},
			null,
			2
		) + '\n'
	);
	git(repository, 'add', '.');
	git(repository, 'commit', '--quiet', '-m', 'synthetic regression');

	return { base, head: git(repository, 'rev-parse', 'HEAD'), repository };
}

let realHeadSurface: Surface | undefined;

function collectRealHeadSurface(): Surface {
	if (realHeadSurface) return realHeadSurface;
	const expression = [
		`import { collectSurface } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};`,
		`const result = collectSurface('HEAD', { cwd: ${JSON.stringify(REPOSITORY_ROOT)} });`,
		'process.stdout.write(JSON.stringify(result.surface));'
	].join('\n');
	const result = checkedSpawn(
		spawnSync(process.execPath, ['--input-type=module', '--eval', expression], { encoding: 'utf8' })
	);
	if (result.status !== 0) throw new Error(result.stderr);
	realHeadSurface = JSON.parse(result.stdout) as Surface;
	return realHeadSurface;
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

	it('protects route handler files and each outward HTTP verb independently', () => {
		expect(violationRun.report?.base.surface.routes).toEqual(
			expect.arrayContaining([
				'apps/web/app/api/sample/route.ts',
				'apps/web/app/api/sample/route.ts::GET',
				'apps/web/app/api/sample/route.ts::POST',
				'apps/web/app/api/sample/route.ts::PUT'
			])
		);
		expect(violationRun.report?.head.surface.routes).toContain('apps/web/app/api/sample/route.ts');
		expect(violationRun.report?.violations).toContainEqual({
			category: 'routes',
			kind: 'removed',
			value: 'apps/web/app/api/sample/route.ts::POST'
		});
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

	it('protects every outward top-level and exported service-object callable', () => {
		const path = 'apps/web/core/services/requests/callables.ts';
		expect(violationRun.report?.base.surface.serviceMethods).toEqual(
			expect.arrayContaining([
				`${path}::directRequest`,
				`${path}::default`,
				`${path}::arrowRequest`,
				`${path}::localRequest`,
				`${path}::renamedRequest`,
				`${path}::RequestService.getThing`,
				`${path}::RequestService.postThing`,
				`${path}::InlineService.deleteThing`,
				`${path}::InlineService.patchThing`
			])
		);
		expect(violationRun.report?.base.surface.serviceMethods.join('\n')).not.toContain('InlineService.state');
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{ category: 'serviceMethods', kind: 'removed', value: `${path}::directRequest` },
				{ category: 'serviceMethods', kind: 'removed', value: `${path}::arrowRequest` },
				{ category: 'serviceMethods', kind: 'removed', value: `${path}::renamedRequest` },
				{ category: 'serviceMethods', kind: 'removed', value: `${path}::InlineService.patchThing` }
			])
		);
	});

	it('preserves direct and aliased outward identities for class-instance service singletons', () => {
		const path = 'apps/web/core/services/client/api/tasks/task-status.service.ts';
		expect(violationRun.report?.base.surface.serviceMethods).toEqual(
			expect.arrayContaining([
				`${path}::TaskStatusService.getTaskStatuses`,
				`${path}::taskStatusService`,
				`${path}::metadataService`
			])
		);
		expect(violationRun.report?.head.surface.serviceMethods).toContain(
			`${path}::TaskStatusService.getTaskStatuses`
		);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{ category: 'serviceMethods', kind: 'removed', value: `${path}::taskStatusService` },
				{ category: 'serviceMethods', kind: 'removed', value: `${path}::metadataService` }
			])
		);
	});

	it('preserves singleton identity through local aliases and source-module reexports', () => {
		const aliasPath = 'apps/web/core/services/client/api/tasks/aliased-task.service.ts';
		const sourcePath = 'apps/web/core/services/client/api/tasks/source.service.ts';
		const reexportPath = 'apps/web/core/services/client/api/tasks/metadata.service.ts';
		expect(violationRun.report?.base.surface.serviceMethods).toEqual(
			expect.arrayContaining([
				`${aliasPath}::outwardTaskService`,
				`${aliasPath}::outwardTaskService=>${aliasPath}::primary`,
				`${reexportPath}::outwardMetadataService`,
				`${reexportPath}::outwardMetadataService=>${sourcePath}::sourceService`
			])
		);
		expect(violationRun.report?.head.surface.serviceMethods).toEqual(
			expect.arrayContaining([
				`${aliasPath}::AliasedTaskService.getTasks`,
				`${sourcePath}::SourceService.getSource`,
				`${sourcePath}::sourceService`
			])
		);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{ category: 'serviceMethods', kind: 'removed', value: `${aliasPath}::outwardTaskService` },
				{
					category: 'serviceMethods',
					kind: 'removed',
					value: `${aliasPath}::outwardTaskService=>${aliasPath}::primary`
				},
				{ category: 'serviceMethods', kind: 'removed', value: `${reexportPath}::outwardMetadataService` },
				{
					category: 'serviceMethods',
					kind: 'removed',
					value: `${reexportPath}::outwardMetadataService=>${sourcePath}::sourceService`
				}
			])
		);
	});

	it('resolves transitive barrel exports, kinds, and cycles without exposing private declarations', () => {
		expect(violationRun.report?.base.surface.publicExports).toEqual(
			expect.arrayContaining([
				'apps/web/core/public/index.ts::runtime::default',
				'apps/web/core/public/index.ts::runtime::AccountFeature',
				'apps/web/core/public/index.ts::runtime::AccountNamespace',
				'apps/web/core/public/index.ts::type::AccountType',
				'apps/web/core/public/index.ts::type::ExtraType',
				'apps/web/core/public/index.ts::runtime::renamedHelper',
				'apps/web/core/public/index.ts::runtime::directExport',
				'apps/web/core/public/index.ts::runtime::LeafRuntime',
				'apps/web/core/public/index.ts::runtime::RuntimeToType',
				'apps/web/core/public/index.ts::type::LeafType',
				'apps/web/core/public/index.ts::runtime::CycleRuntime',
				'packages/contracts/index.d.ts::type::DeclaredOnly',
				'packages/contracts-mts/index.d.mts::type::DeclaredMts',
				'packages/contracts-cts/index.d.cts::type::DeclaredCts'
			])
		);
		expect(violationRun.report?.base.surface.publicExports.join('\n')).not.toContain('PrivateLeaf');
		expect(violationRun.report?.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'apps/web/core/public/index.ts::runtime::LeafRuntime'
		});
		expect(violationRun.report?.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'apps/web/core/public/index.ts::runtime::RuntimeToType'
		});
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'publicExports',
					kind: 'removed',
					value: 'packages/contracts/index.d.ts::type::DeclaredOnly'
				},
				{
					category: 'publicExports',
					kind: 'removed',
					value: 'packages/contracts-mts/index.d.mts::type::DeclaredMts'
				},
				{
					category: 'publicExports',
					kind: 'removed',
					value: 'packages/contracts-cts/index.d.cts::type::DeclaredCts'
				}
			])
		);
	});

	it('removes newly ambiguous star names while retaining one shared source binding', () => {
		expect(violationRun.report?.base.surface.publicExports).toEqual(
			expect.arrayContaining([
				'packages/ambiguous/index.ts::runtime::SharedName',
				'packages/same-binding/index.ts::runtime::SharedSame'
			])
		);
		expect(violationRun.report?.head.surface.publicExports).toContain(
			'packages/same-binding/index.ts::runtime::SharedSame'
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'packages/ambiguous/index.ts::runtime::SharedName'
		});
	});

	it('propagates only actual type bindings through export type star', () => {
		expect(violationRun.report?.base.surface.publicExports).toEqual(
			expect.arrayContaining([
				'packages/type-star/index.ts::type::TypeOnly',
				'packages/type-star/index.ts::type::RuntimeAndTypeClass',
				'packages/type-star/index.ts::type::RuntimeAndTypeEnum'
			])
		);
		expect(violationRun.report?.base.surface.publicExports).not.toContain(
			'packages/type-star/index.ts::type::RuntimeOnly'
		);
		expect(violationRun.report?.violations).not.toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'packages/type-star/index.ts::type::RuntimeOnly'
		});
	});

	it('resolves imported-local exports and applies ambiguity across runtime and type origins', () => {
		expect(violationRun.report?.base.surface.publicExports).toEqual(
			expect.arrayContaining([
				'packages/imported/index.ts::runtime::ImportedDefault',
				'packages/imported/index.ts::runtime::ImportedNamed',
				'packages/imported/index.ts::type::ImportedType',
				'packages/imported/index.ts::runtime::ThingNamespace',
				'packages/cross-kind/index.ts::runtime::CrossKind',
				'packages/same-class/index.ts::runtime::SharedClass',
				'packages/same-class/index.ts::type::SharedClass'
			])
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'packages/imported/index.ts::runtime::ImportedDefault'
		});
		expect(violationRun.report?.head.surface.publicExports).toContain(
			'packages/imported/index.ts::runtime::ImportedNamed'
		);
		expect(violationRun.report?.head.surface.publicExports).not.toContain(
			'packages/cross-kind/index.ts::runtime::CrossKind'
		);
		expect(violationRun.report?.head.surface.publicExports).not.toContain(
			'packages/cross-kind/index.ts::type::CrossKind'
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'publicExports',
			kind: 'removed',
			value: 'packages/cross-kind/index.ts::runtime::CrossKind'
		});
	});

	it('protects every exported overlay symbol in a multi-component file', () => {
		expect(violationRun.report?.base.surface.overlayComponents).toEqual(
			expect.arrayContaining([
				'apps/web/core/components/overlays.tsx::DialogTrigger',
				'apps/web/core/components/overlays.tsx::DialogContent',
				'apps/web/core/components/overlays.tsx::DrawerTrigger',
				'apps/web/core/components/anonymous-modal.tsx'
			])
		);
		expect(violationRun.report?.base.surface.overlayComponents.join('\n')).not.toContain('FakeModal');
		expect(violationRun.report?.base.surface.overlayComponents.join('\n')).not.toContain('CommentDrawer');
		expect(violationRun.report?.violations).toContainEqual({
			category: 'overlayComponents',
			kind: 'removed',
			value: 'apps/web/core/components/overlays.tsx::DialogContent'
		});
		expect(violationRun.report?.violations).toContainEqual({
			category: 'overlayComponents',
			kind: 'removed',
			value: 'apps/web/core/components/anonymous-modal.tsx'
		});
	});

	it('distinguishes overlay components and outward runtime export identities from type or state names', () => {
		const path = 'apps/web/core/components/overlay-identities.tsx';
		expect(violationRun.report?.base.surface.overlayComponents).toEqual(
			expect.arrayContaining([
				`${path}::InternalModal`,
				`${path}::CommandDialog`,
				`${path}::export::CommandDialog`,
				`${path}::export::QuickDialog`,
				`${path}::export::ExportedDrawer`,
				`${path}::export::default`
			])
		);
		expect(violationRun.report?.base.surface.overlayComponents.join('\n')).not.toContain('DialogState');
		expect(violationRun.report?.base.surface.overlayComponents.join('\n')).not.toContain('DialogOpen');
		expect(violationRun.report?.head.surface.overlayComponents).toContain(`${path}::CommandDialog`);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{ category: 'overlayComponents', kind: 'removed', value: `${path}::export::CommandDialog` },
				{ category: 'overlayComponents', kind: 'removed', value: `${path}::export::QuickDialog` },
				{ category: 'overlayComponents', kind: 'removed', value: `${path}::export::default` }
			])
		);
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
				'apps/web/core/account.cy.ts::xit::legacy %s::#1',
				'apps/web/core/account.cy.ts::it.skip.each::tagged loads %s::#1',
				'apps/web/core/account.cy.ts::test.concurrent.only.each::tagged parallel %s::#1',
				'apps/web/core/account.cy.ts::describe.only.each::tagged account %s::#1'
			])
		);
		expect(violationRun.report?.head.surface.testNames.join('\n')).not.toContain('fixture is not a test');
		expect(violationRun.report?.head.surface.testNames.join('\n')).not.toContain('comment is not a test');
	});

	it('resolves Jest global imports, namespaces, and simple local test aliases', () => {
		const path = 'apps/web/core/aliases.test.ts';
		expect(violationRun.report?.base.surface.testNames).toEqual(
			expect.arrayContaining([
				`${path}::named alias::#1`,
				`${path}::namespace alias::#1`,
				`${path}::local alias::#1`,
				`${path}::aliased suite::#1`
			])
		);
		expect(violationRun.report?.head.surface.testMarkers).toEqual(
			expect.arrayContaining([`${path}::test.skip::named alias::#1`, `${path}::test.todo::namespace alias::#1`])
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'testNames',
			kind: 'removed',
			value: `${path}::local alias::#1`
		});
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
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'nx.json::targetDefaults.test.options.testPathPattern=apps/web'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'nx.json::targetDefaults.@nx/jest:jest.options.testNamePattern=preserved'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'nx.json::targetDefaults.test.options.testPathIgnorePatterns=architecture'
				},
				{
					category: 'testConfiguration',
					kind: 'added',
					value: 'apps/web/jest.config.ts::testNamePattern=account'
				}
			])
		);
	});

	it('resolves the exported ESM and CommonJS Jest config objects and their mutations', () => {
		expect(violationRun.report?.base.surface.testConfiguration).toEqual(
			expect.arrayContaining([
				'apps/secondary/jest.config.ts::testMatch=<rootDir>/**/*.test.ts',
				'apps/common/jest.config.js::testRegex=.*\\.test\\.js$',
				'apps/exports/jest.config.js::testMatch=<rootDir>/**/*.spec.js'
			])
		);
		expect(violationRun.report?.base.surface.exclusions).toEqual(
			expect.arrayContaining([
				'apps/secondary/jest.config.ts::testPathIgnorePatterns=/generated/',
				'apps/common/jest.config.js::testPathIgnorePatterns=/node_modules/',
				'apps/exports/jest.config.js::testPathIgnorePatterns=/vendor/'
			])
		);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/secondary/jest.config.ts::testPathIgnorePatterns=/architecture/'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/common/jest.config.js::testPathIgnorePatterns=/legacy/'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/exports/jest.config.js::testPathIgnorePatterns=/skipped/'
				}
			])
		);
	});

	it('merges every Object.assign source for ESM and CommonJS Jest exports', () => {
		expect(violationRun.report?.base.surface.testConfiguration).toEqual(
			expect.arrayContaining([
				'apps/assign-esm/jest.config.ts::testMatch=<rootDir>/**/*.test.ts',
				'apps/assign-cjs/jest.config.js::testRegex=.*\\.spec\\.js$'
			])
		);
		expect(violationRun.report?.base.surface.exclusions).toEqual(
			expect.arrayContaining([
				'apps/assign-esm/jest.config.ts::testPathIgnorePatterns=/generated/',
				'apps/assign-cjs/jest.config.js::testPathIgnorePatterns=/vendor/'
			])
		);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/assign-esm/jest.config.ts::testPathIgnorePatterns=/architecture/'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/assign-cjs/jest.config.js::testPathIgnorePatterns=/legacy/'
				}
			])
		);
	});

	it('fails closed with expression-specific tokens for unknown ESM and CommonJS calls', () => {
		expect(violationRun.report?.base.surface.exclusions).toEqual(
			expect.arrayContaining([
				"apps/unknown-esm/jest.config.ts::<unresolvedConfig>=mysteryConfig({ testMatch: ['<rootDir>/**/*.test.ts'] })",
				"apps/unknown-cjs/jest.config.js::<unresolvedConfig>=unknownFactory({ roots: ['<rootDir>'] })"
			])
		);
		expect(
			violationRun.report?.base.surface.testConfiguration.some((value) => value.startsWith('apps/unknown-'))
		).toBe(false);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'exclusions',
					kind: 'added',
					value: "apps/unknown-esm/jest.config.ts::<unresolvedConfig>=mysteryConfig({ testMatch: ['<rootDir>/only.test.ts'] })"
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: "apps/unknown-cjs/jest.config.js::<unresolvedConfig>=unknownFactory({ roots: ['<rootDir>/only'] })"
				}
			])
		);
	});

	it('fails closed on nested config mutations and source-sensitive dynamic wrappers', () => {
		const mutationPrefix = 'apps/mutating/jest.config.ts::<configMutation>=';
		const baseMutationTokens = violationRun.report?.base.surface.exclusions.filter((value) =>
			value.startsWith(mutationPrefix)
		);
		const headMutationTokens = violationRun.report?.head.surface.exclusions.filter((value) =>
			value.startsWith(mutationPrefix)
		);
		expect(baseMutationTokens).toHaveLength(2);
		expect(headMutationTokens).toHaveLength(2);
		expect(baseMutationTokens).not.toEqual(headMutationTokens);

		for (const path of ['apps/dynamic/jest.config.ts', 'apps/wrapped/jest.config.js']) {
			const prefix = `${path}::<unresolvedConfig>=`;
			const baseToken = violationRun.report?.base.surface.exclusions.find((value) => value.startsWith(prefix));
			const headToken = violationRun.report?.head.surface.exclusions.find((value) => value.startsWith(prefix));
			if (!baseToken || !headToken) throw new Error(`Missing unresolved config evidence for ${path}`);
			expect(baseToken).toContain('::source=');
			expect(headToken).toContain('::source=');
			expect(baseToken).not.toBe(headToken);
			expect(violationRun.report?.violations).toContainEqual({
				category: 'exclusions',
				kind: 'added',
				value: headToken
			});
		}
	});

	it('fails closed when local function and conditional assignments narrow an exported Jest config', () => {
		for (const path of ['apps/function/jest.config.ts', 'apps/conditional/jest.config.ts']) {
			const prefix = `${path}::<configMutation>=`;
			const baseToken = violationRun.report?.base.surface.exclusions.find((value) => value.startsWith(prefix));
			const headToken = violationRun.report?.head.surface.exclusions.find((value) => value.startsWith(prefix));
			if (!baseToken || !headToken) throw new Error(`Missing assignment evidence for ${path}`);
			expect(baseToken).not.toBe(headToken);
			expect(violationRun.report?.violations).toContainEqual({
				category: 'exclusions',
				kind: 'added',
				value: headToken
			});
		}
		expect(
			violationRun.report?.base.surface.exclusions.some((value) =>
				value.startsWith('apps/conditional/jest.config.ts::<configMutation>=config.onlyChanged = false')
			)
		).toBe(false);
		expect(
			violationRun.report?.base.surface.exclusions.some((value) =>
				value.startsWith('apps/conditional/jest.config.ts::<configMutation>=config.passWithNoTests = false')
			)
		).toBe(false);
	});

	it('fingerprints selector sources returned from a named local config function', () => {
		const path = 'apps/function-return/jest.config.ts';
		const prefix = `${path}::<unresolvedConfig>=makeConfig()`;
		const baseToken = violationRun.report?.base.surface.exclusions.find((value) => value.startsWith(prefix));
		const headToken = violationRun.report?.head.surface.exclusions.find((value) => value.startsWith(prefix));
		if (!baseToken || !headToken) throw new Error(`Missing returned config evidence for ${path}`);
		expect(baseToken).toContain('::source=');
		expect(headToken).toContain('::source=');
		expect(baseToken).not.toBe(headToken);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'exclusions',
			kind: 'added',
			value: headToken
		});
	});

	it('keeps safe directional booleans from changing retained selector mutation evidence', () => {
		const path = 'apps/directional-mutation/jest.config.ts';
		const prefix = `${path}::<configMutation>=`;
		const baseToken = violationRun.report?.base.surface.exclusions.find(
			(value) => value.startsWith(prefix) && value.includes('config.testMatch')
		);
		const headToken = violationRun.report?.head.surface.exclusions.find(
			(value) => value.startsWith(prefix) && value.includes('config.testMatch')
		);
		if (!baseToken || !headToken) throw new Error(`Missing conditional selector evidence for ${path}`);
		expect(baseToken).toBe(headToken);
		expect(violationRun.report?.violations.filter(({ value }) => value.startsWith(`${path}::`))).toEqual([]);
	});

	it('preserves selection options nested inside Jest project configuration', () => {
		const path = 'apps/projects/jest.config.ts';
		expect(violationRun.report?.base.surface.testConfiguration).toContain(
			`${path}::projects[0].testMatch=<rootDir>/**/*.spec.ts`
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'testConfiguration',
			kind: 'removed',
			value: `${path}::projects[0].testMatch=<rootDir>/**/*.spec.ts`
		});
	});

	it('collects package Jest settings and every matching Nx project target', () => {
		expect(violationRun.report?.base.surface.testConfiguration).toEqual(
			expect.arrayContaining([
				'apps/config-package/package.json::jest.testMatch=<rootDir>/**/*.test.ts',
				'apps/unit/project.json::targets.unit.executor=@nx/jest:jest',
				'apps/unit/project.json::targets.unit.options.jestConfig=apps/unit/jest.config.ts',
				'workspace.json::projects.other.targets.test.options.roots=apps/other'
			])
		);
		expect(violationRun.report?.base.surface.exclusions).toContain(
			'apps/config-package/package.json::jest.testPathIgnorePatterns=/generated/'
		);
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/config-package/package.json::jest.testPathIgnorePatterns=/architecture/'
				},
				{
					category: 'testConfiguration',
					kind: 'added',
					value: 'apps/unit/project.json::targets.unit.options.roots=apps/unit/specs'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/unit/project.json::targets.unit.options.testPathIgnorePatterns=legacy'
				}
			])
		);
	});

	it('protects every installed Nx Jest selector in project and target defaults', () => {
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'apps/web/project.json::targets.test.options.testFile=apps/web/all.test.ts'
				},
				{
					category: 'testConfiguration',
					kind: 'added',
					value: 'apps/web/project.json::targets.test.options.findRelatedTests=apps/web/core/head.ts'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'apps/web/project.json::targets.test.options.changedSince=main'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/web/project.json::targets.test.options.watch=true'
				},
				{
					category: 'testConfiguration',
					kind: 'added',
					value: 'apps/web/project.json::targets.test.options.config={"testMatch":["only"]}'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'nx.json::targetDefaults.test.options.testFile=apps/web/all.test.ts'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'nx.json::targetDefaults.@nx/jest:jest.options.findRelatedTests=apps/web/core/base.ts'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'nx.json::targetDefaults.unit.options.jestConfig=apps/web/jest.config.ts'
				},
				{
					category: 'testConfiguration',
					kind: 'removed',
					value: 'nx.json::targetDefaults.unit.options.testRegex=unit\\.test\\.ts$'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'nx.json::targetDefaults.@nx/jest:jest.options.onlyChanged=true'
				}
			])
		);
	});

	it('normalizes neutral false selectors while preserving truthy narrowing modes', () => {
		const baseConfiguration = violationRun.report?.base.surface.testConfiguration ?? [];
		expect(baseConfiguration.join('\n')).not.toContain('onlyChanged=false');
		expect(baseConfiguration.join('\n')).not.toContain('watch=false');
		expect(violationRun.report?.violations.some(({ value }) => value.includes('onlyChanged=false'))).toBe(false);
		expect(violationRun.report?.violations.some(({ value }) => value.includes('watch=false'))).toBe(false);
		expect(baseConfiguration.join('\n')).not.toContain('passWithNoTests=false');
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/web/project.json::targets.test.options.onlyChanged=true'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'nx.json::targetDefaults.test.options.watch=true'
				},
				{
					category: 'exclusions',
					kind: 'added',
					value: 'apps/web/project.json::targets.test.options.passWithNoTests=true'
				}
			])
		);
		expect(
			violationRun.report?.violations.some(({ value }) =>
				value.startsWith('workspace.json::projects.other.targets.test.options.')
			)
		).toBe(false);
	});

	it('preserves duplicate href and NEXT_PUBLIC occurrences with stable ordinals', () => {
		expect(violationRun.report?.base.surface.navigation).toEqual(
			expect.arrayContaining([
				'apps/web/core/navigation.tsx::href=/object::#1',
				'apps/web/core/navigation.tsx::ACCOUNT_ROUTE=/account::#1',
				'apps/web/core/navigation.tsx::SETTINGS_PATH=/settings::#1'
			])
		);
		expect(violationRun.report?.base.surface.nextPublicOccurrences).toContain(
			'apps/web/core/navigation.tsx::NEXT_PUBLIC_ASSET_URL::#1'
		);
		expect(violationRun.report?.base.surface.nextPublicOccurrences).toEqual(
			expect.arrayContaining([
				'apps/web/core/navigation.tsx::NEXT_PUBLIC_DESTRUCTURED::#1',
				'apps/web/core/navigation.tsx::NEXT_PUBLIC_IMPORT_ALIAS::#1',
				'apps/web/core/navigation.tsx::NEXT_PUBLIC_DUPLICATE::#1',
				'apps/web/core/navigation.tsx::NEXT_PUBLIC_DUPLICATE::#2'
			])
		);
		expect(violationRun.report?.base.surface.navigation.join('\n')).not.toContain('fake-href');
		expect(violationRun.report?.base.surface.navigation.join('\n')).not.toContain('comment-href');
		expect(violationRun.report?.base.surface.nextPublicOccurrences.join('\n')).not.toContain('NEXT_PUBLIC_FAKE');
		expect(violationRun.report?.base.surface.nextPublicOccurrences.join('\n')).not.toContain('NEXT_PUBLIC_COMMENT');
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
				},
				{
					category: 'nextPublicOccurrences',
					kind: 'removed',
					value: 'apps/web/core/navigation.tsx::NEXT_PUBLIC_DUPLICATE::#2'
				}
			])
		);
	});

	it('protects imperative navigation calls without treating generic array pushes as routes', () => {
		const path = 'apps/web/core/imperative-navigation.ts';
		expect(violationRun.report?.base.surface.navigation).toEqual(
			expect.arrayContaining([
				`${path}::router.push=/imperative::#1`,
				`${path}::navigation.replace=/replace::#1`,
				`${path}::redirect=/redirect::#1`,
				`${path}::permanentRedirect=<dynamic:dynamicDestination>::#1`,
				`${path}::location.assign=/assign::#1`,
				`${path}::location.replace=<dynamic:dynamicDestination>::#1`
			])
		);
		expect(violationRun.report?.base.surface.navigation.join('\n')).not.toContain('still-not-navigation');
		expect(violationRun.report?.violations).toEqual(
			expect.arrayContaining([
				{ category: 'navigation', kind: 'removed', value: `${path}::router.push=/imperative::#1` },
				{ category: 'navigation', kind: 'removed', value: `${path}::redirect=/redirect::#1` }
			])
		);
	});

	it('follows simple process.env and import.meta.env aliases for NEXT_PUBLIC uses', () => {
		const path = 'apps/web/core/imperative-navigation.ts';
		expect(violationRun.report?.base.surface.nextPublicOccurrences).toEqual(
			expect.arrayContaining([
				`${path}::NEXT_PUBLIC_ALIAS_URL::#1`,
				`${path}::NEXT_PUBLIC_META_ALIAS_URL::#1`,
				`${path}::NEXT_PUBLIC_ALIAS_DESTRUCTURED::#1`
			])
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'nextPublicOccurrences',
			kind: 'removed',
			value: `${path}::NEXT_PUBLIC_ALIAS_URL::#1`
		});
	});

	it('preserves NEXT_PUBLIC occurrences in suffixed environment files', () => {
		const path = 'apps/web/.env.local';
		expect(violationRun.report?.base.surface.nextPublicOccurrences).toEqual(
			expect.arrayContaining([
				`${path}::NEXT_PUBLIC_SUFFIXED_ENV_RETAINED::#1`,
				`${path}::NEXT_PUBLIC_SUFFIXED_ENV_REMOVED::#1`
			])
		);
		expect(violationRun.report?.violations).toContainEqual({
			category: 'nextPublicOccurrences',
			kind: 'removed',
			value: `${path}::NEXT_PUBLIC_SUFFIXED_ENV_REMOVED::#1`
		});
	});

	it('uses deterministic code-point order rather than locale collation', () => {
		const navigation = violationRun.report?.base.surface.navigation.filter((value) => value.includes('::href=/'));
		expect(navigation).toEqual([
			'apps/web/core/navigation.tsx::href=/a::#1',
			'apps/web/core/navigation.tsx::href=/object::#1',
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

	it('covers real class and standalone service callables from the repository', () => {
		const surface = collectRealHeadSurface();
		expect(surface.serviceMethods).toEqual(
			expect.arrayContaining([
				'apps/web/core/services/client/api/tasks/task.service.ts::TaskService.createTask',
				'apps/web/core/services/client/api/tasks/task.service.ts::TaskService.getTasks',
				'apps/web/core/services/client/api/activities/activity.service.ts::ActivityService.getActivities',
				'apps/web/core/services/client/api/currencies/currency.service.ts::CurrencyService.getCurrencies',
				'apps/web/core/services/client/axios.ts::getAPI',
				'apps/web/core/services/client/axios.ts::getAPIDirect',
				'apps/web/core/services/client/axios.ts::get',
				'apps/web/core/services/client/axios.ts::post',
				'apps/web/core/services/client/axios.ts::deleteApi',
				'apps/web/core/services/client/axios.ts::put',
				'apps/web/core/services/client/axios.ts::patch',
				'apps/web/core/services/server/requests/auth.ts::registerUserRequest'
			])
		);
		expect(surface.serviceMethods.length).toBeGreaterThan(400);
	});

	it('covers the real exported task metadata service singleton identity', () => {
		expect(collectRealHeadSurface().serviceMethods).toContain(
			'apps/web/core/services/client/api/tasks/task-status.service.ts::taskStatusService'
		);
	});

	it('covers all real App Router route files and outward handler verbs', () => {
		const routes = collectRealHeadSurface().routes;
		expect(routes.filter((value) => /\/route\.[jt]s$/.test(value))).toHaveLength(105);
		expect(
			routes.filter((value) => /\/route\.[jt]s::(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(value))
		).toHaveLength(145);
		expect(routes).toEqual(
			expect.arrayContaining([
				'apps/web/app/api/auth/[...nextauth]/route.ts::GET',
				'apps/web/app/api/auth/[...nextauth]/route.ts::POST',
				'apps/web/app/api/daily-plan/[id]/route.ts::GET',
				'apps/web/app/api/daily-plan/[id]/route.ts::PUT',
				'apps/web/app/api/daily-plan/[id]/route.ts::DELETE',
				'apps/web/app/api/subscribe/route.ts::POST'
			])
		);
	});

	it('covers imported reexports, package Jest config, and outward overlay identity in real files', () => {
		const surface = collectRealHeadSurface();
		expect(surface.publicExports).toEqual(
			expect.arrayContaining([
				'packages/toolkit/builder/app/craft/components/atoms-panel/data/index.ts::runtime::SECTION_IDS',
				'packages/toolkit/builder/app/craft/components/drag-components/layout/row-layout/index.ts::type::RowProps',
				'packages/toolkit/builder/app/craft/components/drag-components/layout/row-layout/index.ts::runtime::ROW_PRESETS'
			])
		);
		expect(surface.exclusions).toEqual(
			expect.arrayContaining([
				'apps/server-web/package.json::jest.testPathIgnorePatterns=release/app/dist',
				'apps/server-web/package.json::jest.testPathIgnorePatterns=.erb/dll'
			])
		);
		expect(surface.overlayComponents).toEqual(
			expect.arrayContaining([
				'apps/web/core/components/common/command.tsx::CommandDialog',
				'apps/web/core/components/common/command.tsx::export::CommandDialog'
			])
		);
	});

	it('collects the effective CommonJS Jest configuration from the real mobile workspace', () => {
		const surface = collectRealHeadSurface();
		expect(surface.exclusions).toEqual(
			expect.arrayContaining([
				'apps/mobile/jest.config.js::testPathIgnorePatterns=<rootDir>/node_modules/',
				'apps/mobile/jest.config.js::testPathIgnorePatterns=/detox',
				'apps/mobile/jest.config.js::testPathIgnorePatterns=@react-native'
			])
		);
		expect(surface.exclusions).not.toContain('apps/mobile/jest.config.js::<unresolvedConfig>');
	});

	it('recognizes the real nextJest-produced local passthrough wrapper', () => {
		const surface = collectRealHeadSurface();
		expect(surface.testConfiguration).toContain('apps/web/jest.config.ts::testMatch=<rootDir>/**/*.test.[jt]s?(x)');
		expect(
			surface.exclusions.some((value) => value.startsWith('apps/web/jest.config.ts::<unresolvedConfig>'))
		).toBe(false);
	});

	it('does not treat architecture fixture strings as real navigation or environment uses', () => {
		const surface = collectRealHeadSurface();
		const fixturePath = 'apps/web/test/architecture/feature-surface-preserved.test.ts::';
		expect(surface.navigation.some((value) => value.startsWith(fixturePath))).toBe(false);
		expect(surface.nextPublicOccurrences.some((value) => value.startsWith(fixturePath))).toBe(false);
	});
});
