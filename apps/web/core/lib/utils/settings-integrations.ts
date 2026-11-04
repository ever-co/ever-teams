import type {
	TGithubMetadata,
	TGithubRepositories,
	TIntegrationTenantList,
	TIntegrationTypeList,
	TMinimalGithubMetadata,
	TMinimalGithubRepositories,
	TOrganizationProject,
	TOrganizationTeam
} from '@/core/types/schemas';

export const GITHUB_INTEGRATION_TENANT_NAME = 'Github';

/** As in the former settings, the GitHub tenant is read only when the integration catalog has this type. */
const ALL_INTEGRATIONS_TYPE_NAME = 'All Integrations';

/**
 * Same value as `RETURN_PARAM` of `ever-connect-panel.tsx`, which the Ever Platform import guard keeps out of the
 * settings navigation.
 */
export const EVER_CONNECT_RETURN_PARAM = 'ever_connect_return';

export type GithubConnectionStatus =
	| 'loading'
	| 'loadError'
	| 'githubError'
	| 'notConnected'
	| 'suspended'
	| 'connected';

export type GithubMetadata = TGithubMetadata | TMinimalGithubMetadata;

export type GithubRepositories = TGithubRepositories | TMinimalGithubRepositories;

export type GithubRepositoryItem = GithubRepositories['repositories'][number];

export interface GithubRepositoryOption {
	value: string;
	label: string;
}

export interface GithubProjectSettings {
	isTasksAutoSync: boolean;
	isTasksAutoSyncOnLabel: boolean;
	syncTag: string;
	linkedRepositoryId: string | null;
	linkedRepositoryName: string | null;
}

export interface GithubInstallationFacts {
	account: string | null;
	installedAt: Date | null;
	suspendedAt: Date | null;
	manageUrl: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function stringField(record: Record<string, unknown>, key: string): string | null {
	const value = record[key];
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

function dateOf(value: unknown): Date | null {
	const isText = typeof value === 'string';
	const isNumber = typeof value === 'number';
	const isDateLike = isText || isNumber;
	if (!isDateLike) {
		return null;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date;
}

function githubPageOf(value: string | null): string | null {
	if (!value) {
		return null;
	}
	try {
		const url = new URL(value);
		const isHttps = url.protocol === 'https:';
		const isGithub = url.hostname === 'github.com';
		if (isHttps && isGithub) {
			return url.toString();
		}
		return null;
	} catch {
		return null;
	}
}

export function hasIntegrationCatalog(types: ReadonlyArray<TIntegrationTypeList> | undefined): boolean {
	if (!types) {
		return false;
	}
	return types.some((type) => type.name === ALL_INTEGRATIONS_TYPE_NAME);
}

export function firstIntegrationIdOf(items: ReadonlyArray<TIntegrationTenantList> | undefined): string | null {
	const first = items?.[0];
	if (!first) {
		return null;
	}
	return first.id;
}

/**
 * Not the active project cookie: it keeps the previous team's project when the new team has none, and is missing
 * until a team has been picked.
 */
export function teamGithubProjectOf(team: TOrganizationTeam | null | undefined): TOrganizationProject | null {
	const first = team?.projects?.[0];
	if (!first) {
		return null;
	}
	return first;
}

interface LinkedRepository {
	id: string;
	name: string | null;
}

function linkedRepositoryFrom(value: unknown): LinkedRepository | null {
	if (!isRecord(value)) {
		return null;
	}
	const repositoryId = value.repositoryId;
	const hasNumericId = typeof repositoryId === 'number';
	const hasTextId = typeof repositoryId === 'string';
	const hasId = hasNumericId || hasTextId;
	if (!hasId) {
		return null;
	}
	const fullName = stringField(value, 'fullName');
	const shortName = stringField(value, 'name');
	const name = fullName ?? shortName;
	return { id: String(repositoryId), name };
}

/**
 * The GitHub plugin stores the link as `customFields.repository`; a top-level `repository` is read too, for
 * responses shaped the older way.
 */
function linkedRepositoryOf(project: TOrganizationProject): LinkedRepository | null {
	const customFields = project.customFields;
	if (isRecord(customFields)) {
		const fromCustomFields = linkedRepositoryFrom(customFields.repository);
		if (fromCustomFields) {
			return fromCustomFields;
		}
	}
	return linkedRepositoryFrom(project.repository);
}

export const EMPTY_GITHUB_PROJECT_SETTINGS: GithubProjectSettings = {
	isTasksAutoSync: false,
	isTasksAutoSyncOnLabel: false,
	syncTag: '',
	linkedRepositoryId: null,
	linkedRepositoryName: null
};

export function githubProjectSettingsOf(project: TOrganizationProject | null): GithubProjectSettings {
	if (!project) {
		return EMPTY_GITHUB_PROJECT_SETTINGS;
	}
	const linked = linkedRepositoryOf(project);
	return {
		isTasksAutoSync: Boolean(project.isTasksAutoSync),
		isTasksAutoSyncOnLabel: Boolean(project.isTasksAutoSyncOnLabel),
		syncTag: project.syncTag ?? '',
		linkedRepositoryId: linked?.id ?? null,
		linkedRepositoryName: linked?.name ?? null
	};
}

export function githubSettingsSnapshotKeyOf(projectId: string | null, settings: GithubProjectSettings): string {
	return JSON.stringify([projectId, settings]);
}

function repositoryLabelOf(repository: GithubRepositoryItem): string {
	if (repository.full_name) {
		return repository.full_name;
	}
	return repository.name;
}

export function repositoryOptionsOf(
	repositories: GithubRepositories | undefined,
	settings: GithubProjectSettings
): GithubRepositoryOption[] {
	const listed = repositories?.repositories ?? [];
	const options = listed.map((repository) => ({
		value: String(repository.id),
		label: repositoryLabelOf(repository)
	}));
	const linkedId = settings.linkedRepositoryId;
	if (!linkedId) {
		return options;
	}
	const isListed = options.some((option) => option.value === linkedId);
	if (isListed) {
		return options;
	}
	const label = settings.linkedRepositoryName ?? linkedId;
	return [...options, { value: linkedId, label }];
}

export function repositoryOfId(
	repositories: GithubRepositories | undefined,
	value: string
): GithubRepositoryItem | null {
	const found = repositories?.repositories.find((repository) => String(repository.id) === value);
	return found ?? null;
}

export function repositoryLabelOfId(options: ReadonlyArray<GithubRepositoryOption>, value: string | null): string {
	if (!value) {
		return '';
	}
	const found = options.find((option) => option.value === value);
	return found?.label ?? '';
}

export function githubInstallationFactsOf(metadata: GithubMetadata | undefined): GithubInstallationFacts {
	if (!isRecord(metadata)) {
		return { account: null, installedAt: null, suspendedAt: null, manageUrl: null };
	}
	let account: string | null = null;
	if (isRecord(metadata.account)) {
		account = stringField(metadata.account, 'login');
	}
	return {
		account,
		installedAt: dateOf(metadata.created_at),
		suspendedAt: dateOf(metadata.suspended_at),
		manageUrl: githubPageOf(stringField(metadata, 'html_url'))
	};
}

export function isGithubInstallationSuspended(metadata: GithubMetadata | undefined): boolean {
	if (!isRecord(metadata)) {
		return false;
	}
	const suspendedAt = metadata.suspended_at;
	if (suspendedAt === null) {
		return false;
	}
	if (suspendedAt === undefined) {
		return false;
	}
	return suspendedAt !== '';
}

export interface GithubConnectionInput {
	types: ReadonlyArray<TIntegrationTypeList> | undefined;
	typesError: unknown;
	tenantItems: ReadonlyArray<TIntegrationTenantList> | undefined;
	tenantError: unknown;
	metadata: GithubMetadata | undefined;
	metadataError: unknown;
	repositories: GithubRepositories | undefined;
	repositoriesError: unknown;
}

export function githubConnectionStatusOf(input: GithubConnectionInput): GithubConnectionStatus {
	if (input.typesError) {
		return 'loadError';
	}
	if (!input.types) {
		return 'loading';
	}
	if (!hasIntegrationCatalog(input.types)) {
		return 'notConnected';
	}
	if (input.tenantError) {
		return 'loadError';
	}
	if (!input.tenantItems) {
		return 'loading';
	}
	if (!firstIntegrationIdOf(input.tenantItems)) {
		return 'notConnected';
	}
	const githubFailed = Boolean(input.metadataError) || Boolean(input.repositoriesError);
	if (githubFailed) {
		return 'githubError';
	}
	const githubPending = !input.metadata || !input.repositories;
	if (githubPending) {
		return 'loading';
	}
	if (isGithubInstallationSuspended(input.metadata)) {
		return 'suspended';
	}
	return 'connected';
}

export function githubReadErrorOf(input: GithubConnectionInput): unknown {
	const errors = [input.typesError, input.tenantError, input.metadataError, input.repositoriesError];
	const firstError = errors.find(Boolean);
	return firstError ?? null;
}

function localeSegmentOf(locale: string): string {
	if (!locale) {
		return '';
	}
	return `/${locale}`;
}

export function githubCallbackUrlOf(origin: string, locale: string): string {
	return `${origin}${localeSegmentOf(locale)}/integration/github`;
}

export function githubInstallUrlOf(appName: string, origin: string, locale: string): string {
	if (!appName) {
		return '';
	}
	const state = encodeURIComponent(githubCallbackUrlOf(origin, locale));
	return `https://github.com/apps/${appName}/installations/new?state=${state}`;
}

export function formatInstallDay(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
