import { ApiErrorService } from '../../api-error.service';
import { queryKeys } from '@/core/query/keys';
import {
	TASK_METADATA_SECTIONS,
	TaskMetadataScope,
	TaskMetadataSection,
	canonicalizeTaskMetadataInclude
} from '@/core/types/interfaces/task/task-metadata-bootstrap';
import { issueTypeService } from './issue-type.service';
import { taskLabelService } from './task-label.service';
import { taskMetadataBootstrapService } from './task-metadata-bootstrap.service';
import { taskPriorityService } from './task-priority.service';
import { taskRelatedIssueTypeService } from './task-related-issue-type.service';
import { taskSizeService } from './task-size.service';
import { taskStatusService } from './task-status.service';
import { taskVersionService } from './task-version.service';

const mockCookieState = {
	activeTeamId: 'cookie-team',
	organizationId: 'cookie-organization',
	tenantId: 'cookie-tenant'
};

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => mockCookieState.activeTeamId,
	getOrganizationIdCookie: () => mockCookieState.organizationId,
	getTenantIdCookie: () => mockCookieState.tenantId
}));

jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn(), error: jest.fn() }) }
}));

jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

const scope: TaskMetadataScope = {
	tenantId: 'captured-tenant',
	organizationId: 'captured-organization',
	organizationTeamId: 'captured-team',
	projectId: 'captured-project'
};

const canonicalAll = [
	'issueTypes',
	'relatedIssueTypes',
	'taskLabels',
	'taskPriorities',
	'taskSizes',
	'taskStatuses',
	'taskVersions'
] as const;

const fullBundle = {
	taskStatuses: { items: [], total: 11 },
	taskPriorities: { items: [], total: 12 },
	taskSizes: { items: [], total: 13 },
	taskLabels: { items: [{ opaque: 'label' }], total: 14 },
	taskVersions: { items: [], total: 15 },
	issueTypes: { items: [{ opaque: 'issue' }], total: 16 },
	relatedIssueTypes: { items: [{ opaque: 'related' }], total: 17 }
};

function axiosResponse<T>(data: T) {
	return {
		config: {},
		data,
		headers: {},
		status: 200,
		statusText: 'OK'
	};
}

function responseError(responseStatus: number, status?: number) {
	return ApiErrorService.fromAxiosError({
		message: 'Request failed',
		status,
		response: {
			data: {},
			headers: {},
			status: responseStatus,
			statusText: 'Error'
		}
	});
}

function mockBootstrapResponse(data: unknown) {
	return jest.spyOn(taskMetadataBootstrapService, 'get').mockResolvedValue(axiosResponse(data) as never);
}

function mockLegacySuccesses() {
	return {
		statuses: jest.spyOn(taskStatusService, 'getTaskStatuses').mockResolvedValue(fullBundle.taskStatuses as never),
		priorities: jest
			.spyOn(taskPriorityService, 'getTaskPrioritiesList')
			.mockResolvedValue(fullBundle.taskPriorities as never),
		sizes: jest.spyOn(taskSizeService, 'getTaskSizes').mockResolvedValue(fullBundle.taskSizes as never),
		labels: jest
			.spyOn(taskLabelService, 'getTaskLabelsList')
			.mockResolvedValue(axiosResponse(fullBundle.taskLabels) as never),
		versions: jest.spyOn(taskVersionService, 'getTaskVersions').mockResolvedValue(fullBundle.taskVersions as never),
		issueTypes: jest
			.spyOn(issueTypeService, 'getIssueTypeList')
			.mockResolvedValue(axiosResponse(fullBundle.issueTypes) as never),
		relatedIssueTypes: jest
			.spyOn(taskRelatedIssueTypeService, 'getTaskRelatedIssueTypeList')
			.mockResolvedValue(axiosResponse(fullBundle.relatedIssueTypes) as never)
	};
}

async function allowPromiseChainToStart() {
	for (let index = 0; index < 5; index += 1) {
		await Promise.resolve();
	}
}

describe('task metadata include canonicalization', () => {
	it('returns a sorted clone of all seven sections when include is undefined', () => {
		const canonical = canonicalizeTaskMetadataInclude(undefined);

		expect(TASK_METADATA_SECTIONS).toEqual([
			'taskStatuses',
			'taskPriorities',
			'taskSizes',
			'taskLabels',
			'taskVersions',
			'issueTypes',
			'relatedIssueTypes'
		]);
		expect(canonical).toEqual(canonicalAll);
		expect(canonical).not.toBe(TASK_METADATA_SECTIONS);
	});

	it('preserves an explicit empty include as a new empty array', () => {
		const include: TaskMetadataSection[] = [];
		const canonical = canonicalizeTaskMetadataInclude(include);

		expect(canonical).toEqual([]);
		expect(canonical).not.toBe(include);
	});

	it('deduplicates and ASCII-sorts without mutating the caller array', () => {
		const include: TaskMetadataSection[] = ['taskVersions', 'issueTypes', 'taskVersions', 'taskLabels'];
		const before = [...include];

		expect(canonicalizeTaskMetadataInclude(include)).toEqual(['issueTypes', 'taskLabels', 'taskVersions']);
		expect(include).toEqual(before);
	});

	it('does not silently filter an unsupported runtime value', () => {
		const include = ['taskStatuses', 'futureSection'] as TaskMetadataSection[];

		expect(canonicalizeTaskMetadataInclude(include)).toEqual(['futureSection', 'taskStatuses']);
	});
});

describe('task metadata bootstrap bundle', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('sends canonical scope and include while keeping tenant in transport only', async () => {
		const get = mockBootstrapResponse(fullBundle);
		const signal = new AbortController().signal;

		await taskMetadataBootstrapService.getTaskMetadataBootstrap(
			scope,
			['taskVersions', 'issueTypes', 'taskVersions'],
			signal
		);

		expect(get).toHaveBeenCalledTimes(1);
		const [url, config] = get.mock.calls[0];
		const parsed = new URL(url as string, 'https://client.test');
		expect(parsed.pathname).toBe('/task-metadata/bootstrap');
		expect(Object.fromEntries(parsed.searchParams)).toEqual({
			include: 'issueTypes,taskVersions',
			organizationId: 'captured-organization',
			organizationTeamId: 'captured-team',
			projectId: 'captured-project'
		});
		expect(parsed.searchParams.has('tenantId')).toBe(false);
		expect(config).toEqual({ tenantId: 'captured-tenant', signal });
	});

	it('omits an explicitly missing team and project instead of consulting cookies', async () => {
		const get = mockBootstrapResponse(fullBundle);
		const capturedScope: TaskMetadataScope = {
			tenantId: 'captured-tenant',
			organizationId: 'captured-organization'
		};

		await taskMetadataBootstrapService.getTaskMetadataBootstrap(capturedScope, ['taskLabels']);

		const [url] = get.mock.calls[0];
		const parsed = new URL(url as string, 'https://client.test');
		expect(Object.fromEntries(parsed.searchParams)).toEqual({
			include: 'taskLabels',
			organizationId: 'captured-organization'
		});
		expect(url).not.toContain(mockCookieState.activeTeamId);
		expect(url).not.toContain(mockCookieState.organizationId);
		expect(url).not.toContain(mockCookieState.tenantId);
	});

	it('uses tenant as a fixed query-key position while producing the same HTTP URL for otherwise equal scopes', async () => {
		const get = mockBootstrapResponse({ taskLabels: fullBundle.taskLabels });
		const first = { ...scope, tenantId: 'tenant-a' };
		const second = { ...scope, tenantId: 'tenant-b' };

		await taskMetadataBootstrapService.getTaskMetadataBootstrap(first, ['taskLabels']);
		await taskMetadataBootstrapService.getTaskMetadataBootstrap(second, ['taskLabels']);

		expect(get.mock.calls[0][0]).toBe(get.mock.calls[1][0]);
		expect(get.mock.calls[0][1]).toEqual({ tenantId: 'tenant-a', signal: undefined });
		expect(get.mock.calls[1][1]).toEqual({ tenantId: 'tenant-b', signal: undefined });
		expect(queryKeys.taskMetadata.bootstrap(first, ['taskLabels'])).not.toEqual(
			queryKeys.taskMetadata.bootstrap(second, ['taskLabels'])
		);
	});

	it('requests and returns all seven validated/preserved pagination sections when include is undefined', async () => {
		const get = mockBootstrapResponse(fullBundle);

		const result = await taskMetadataBootstrapService.getTaskMetadataBootstrap(scope);

		const [url] = get.mock.calls[0];
		const parsed = new URL(url as string, 'https://client.test');
		expect(parsed.searchParams.get('include')).toBe(canonicalAll.join(','));
		expect(result).toEqual(fullBundle);
		expect(result.taskLabels).toBe(fullBundle.taskLabels);
		expect(result.issueTypes).toBe(fullBundle.issueTypes);
		expect(result.relatedIssueTypes).toBe(fullBundle.relatedIssueTypes);
	});

	it('returns only selected sections and omits unrequested response siblings', async () => {
		mockBootstrapResponse(fullBundle);

		const result = await taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, [
			'taskVersions',
			'taskLabels'
		]);

		expect(result).toEqual({
			taskLabels: fullBundle.taskLabels,
			taskVersions: fullBundle.taskVersions
		});
		expect('taskStatuses' in result).toBe(false);
		expect('issueTypes' in result).toBe(false);
	});

	it('preserves explicit empty include as include= and returns an empty selected object', async () => {
		const get = mockBootstrapResponse(fullBundle);

		const result = await taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, []);

		expect(get.mock.calls[0][0]).toContain('include=');
		expect(new URL(get.mock.calls[0][0] as string, 'https://client.test').searchParams.get('include')).toBe('');
		expect(result).toEqual({});
	});

	it.each([
		['taskStatuses', { taskStatuses: { items: [{}], total: 1 } }],
		['taskPriorities', { taskPriorities: { items: [{}], total: 2 } }],
		['taskSizes', { taskSizes: { items: [{}], total: 3 } }],
		['taskVersions', { taskVersions: { items: [{}], total: 4 } }]
	] as const)('rejects malformed %s without invoking legacy fallback', async (section, response) => {
		mockBootstrapResponse(response);
		const legacy = mockLegacySuccesses();

		await expect(taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, [section])).rejects.toMatchObject({
			name: 'ValidationError'
		});
		expect(Object.values(legacy).every((loader) => loader.mock.calls.length === 0)).toBe(true);
	});
});

describe('strict endpoint-unavailable fallback', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('starts all seven selected legacy loaders once before any one resolves and preserves their values', async () => {
		jest.spyOn(taskMetadataBootstrapService, 'get').mockRejectedValue(responseError(404));
		const releases: Array<() => void> = [];
		const deferred = <T>(value: T) =>
			new Promise<T>((resolve) => {
				releases.push(() => resolve(value));
			});
		const legacy = {
			statuses: jest
				.spyOn(taskStatusService, 'getTaskStatuses')
				.mockImplementation(() => deferred(fullBundle.taskStatuses) as never),
			priorities: jest
				.spyOn(taskPriorityService, 'getTaskPrioritiesList')
				.mockImplementation(() => deferred(fullBundle.taskPriorities) as never),
			sizes: jest
				.spyOn(taskSizeService, 'getTaskSizes')
				.mockImplementation(() => deferred(fullBundle.taskSizes) as never),
			labels: jest
				.spyOn(taskLabelService, 'getTaskLabelsList')
				.mockImplementation(() => deferred(axiosResponse(fullBundle.taskLabels)) as never),
			versions: jest
				.spyOn(taskVersionService, 'getTaskVersions')
				.mockImplementation(() => deferred(fullBundle.taskVersions) as never),
			issueTypes: jest
				.spyOn(issueTypeService, 'getIssueTypeList')
				.mockImplementation(() => deferred(axiosResponse(fullBundle.issueTypes)) as never),
			relatedIssueTypes: jest
				.spyOn(taskRelatedIssueTypeService, 'getTaskRelatedIssueTypeList')
				.mockImplementation(() => deferred(axiosResponse(fullBundle.relatedIssueTypes)) as never)
		};

		const resultPromise = taskMetadataBootstrapService.getTaskMetadataBootstrap(scope);
		await allowPromiseChainToStart();

		expect(releases).toHaveLength(7);
		Object.values(legacy).forEach((loader) => {
			expect(loader).toHaveBeenCalledTimes(1);
			expect(loader).toHaveBeenCalledWith(scope);
		});
		releases.forEach((release) => release());
		const result = await resultPromise;
		expect(result).toEqual(fullBundle);
		expect(result.taskStatuses).toBe(fullBundle.taskStatuses);
		expect(result.taskLabels).toBe(fullBundle.taskLabels);
		expect(result.issueTypes).toBe(fullBundle.issueTypes);
		expect(result.relatedIssueTypes).toBe(fullBundle.relatedIssueTypes);
	});

	it.each([405, 501])(
		'falls back for a genuine HTTP %i response and invokes only selected loaders',
		async (status) => {
			jest.spyOn(taskMetadataBootstrapService, 'get').mockRejectedValue(responseError(status));
			const legacy = mockLegacySuccesses();

			const result = await taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, [
				'taskLabels',
				'issueTypes'
			]);

			expect(result).toEqual({
				issueTypes: fullBundle.issueTypes,
				taskLabels: fullBundle.taskLabels
			});
			expect(legacy.labels).toHaveBeenCalledTimes(1);
			expect(legacy.issueTypes).toHaveBeenCalledTimes(1);
			expect(legacy.statuses).not.toHaveBeenCalled();
			expect(legacy.priorities).not.toHaveBeenCalled();
			expect(legacy.sizes).not.toHaveBeenCalled();
			expect(legacy.versions).not.toHaveBeenCalled();
			expect(legacy.relatedIssueTypes).not.toHaveBeenCalled();
		}
	);

	it('rejects the whole fallback when any selected loader rejects', async () => {
		const fallbackError = new Error('legacy section failed');
		jest.spyOn(taskMetadataBootstrapService, 'get').mockRejectedValue(responseError(404));
		const legacy = mockLegacySuccesses();
		legacy.issueTypes.mockRejectedValue(fallbackError);

		await expect(
			taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, ['taskLabels', 'issueTypes'])
		).rejects.toBe(fallbackError);
		expect(legacy.labels).toHaveBeenCalledTimes(1);
		expect(legacy.issueTypes).toHaveBeenCalledTimes(1);
	});

	it.each([
		['synthetic status 404', ApiErrorService.fromAxiosError({ message: 'Request failed', status: 404 })],
		['synthetic status 405', ApiErrorService.fromAxiosError({ message: 'Request failed', status: 405 })],
		['synthetic status 501', ApiErrorService.fromAxiosError({ message: 'Request failed', status: 501 })],
		['message-derived 404', ApiErrorService.fromAxiosError({ message: 'Request failed with HTTP 404' })],
		['message-derived 405', ApiErrorService.fromAxiosError({ message: 'Request failed with HTTP 405' })],
		['message-derived 501', ApiErrorService.fromAxiosError({ message: 'Request failed with HTTP 501' })],
		['code-derived 404', ApiErrorService.fromAxiosError({ code: 'ERR_BAD_REQUEST', message: 'Request failed' })],
		['code-derived 501', ApiErrorService.fromAxiosError({ code: 'ERR_NOT_SUPPORT', message: 'Request failed' })],
		['raw statusCode 404', new ApiErrorService('legacy status', 404)],
		['network failure', ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'offline' })],
		['cancellation', ApiErrorService.fromAxiosError({ code: 'ERR_CANCELED', message: 'cancelled' })],
		['aborted timeout', ApiErrorService.fromAxiosError({ code: 'ECONNABORTED', message: 'timeout' })],
		['elapsed timeout', ApiErrorService.fromAxiosError({ code: 'ETIMEDOUT', message: 'timeout' })]
	] as const)('does not fallback for %s', async (_label, error) => {
		jest.spyOn(taskMetadataBootstrapService, 'get').mockRejectedValue(error);
		const legacy = mockLegacySuccesses();

		await expect(taskMetadataBootstrapService.getTaskMetadataBootstrap(scope)).rejects.toBe(error);
		expect(Object.values(legacy).every((loader) => loader.mock.calls.length === 0)).toBe(true);
	});

	it.each([400, 401, 403, 409, 422, 429, 500, 502, 503, 504])(
		'does not fallback for a genuine HTTP %i response',
		async (status) => {
			const error = responseError(status);
			jest.spyOn(taskMetadataBootstrapService, 'get').mockRejectedValue(error);
			const legacy = mockLegacySuccesses();

			await expect(taskMetadataBootstrapService.getTaskMetadataBootstrap(scope)).rejects.toBe(error);
			expect(Object.values(legacy).every((loader) => loader.mock.calls.length === 0)).toBe(true);
		}
	);

	it('does not widen explicit empty include when the server rejects include=', async () => {
		const error = responseError(400);
		const get = jest.spyOn(taskMetadataBootstrapService, 'get').mockRejectedValue(error);
		const legacy = mockLegacySuccesses();

		await expect(taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, [])).rejects.toBe(error);
		expect(get.mock.calls[0][0]).toContain('include=');
		expect(Object.values(legacy).every((loader) => loader.mock.calls.length === 0)).toBe(true);
	});
});

describe('captured-scope legacy metadata reads', () => {
	beforeEach(() => {
		mockCookieState.activeTeamId = 'cookie-team';
		mockCookieState.organizationId = 'cookie-organization';
		mockCookieState.tenantId = 'cookie-tenant';
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('preserves every exact no-argument URL, config, and return contract', async () => {
		const statusPage = { items: [], total: 21 };
		const priorityPage = { items: [], total: 22 };
		const sizePage = { items: [], total: 23 };
		const labelPage = { items: [], total: 24 };
		const versionPage = { items: [], total: 25 };
		const issuePage = { items: [], total: 26 };
		const relatedPage = { items: [], total: 27 };
		const statusResponse = axiosResponse(statusPage);
		const priorityResponse = axiosResponse(priorityPage);
		const sizeResponse = axiosResponse(sizePage);
		const labelResponse = axiosResponse(labelPage);
		const versionResponse = axiosResponse(versionPage);
		const issueResponse = axiosResponse(issuePage);
		const relatedResponse = axiosResponse(relatedPage);
		const statusGet = jest.spyOn(taskStatusService, 'get').mockResolvedValue(statusResponse as never);
		const priorityGet = jest.spyOn(taskPriorityService, 'get').mockResolvedValue(priorityResponse as never);
		const sizeGet = jest.spyOn(taskSizeService, 'get').mockResolvedValue(sizeResponse as never);
		const labelGet = jest.spyOn(taskLabelService, 'get').mockResolvedValue(labelResponse as never);
		const versionGet = jest.spyOn(taskVersionService, 'get').mockResolvedValue(versionResponse as never);
		const issueGet = jest.spyOn(issueTypeService, 'get').mockResolvedValue(issueResponse as never);
		const relatedGet = jest.spyOn(taskRelatedIssueTypeService, 'get').mockResolvedValue(relatedResponse as never);

		await expect(taskStatusService.getTaskStatuses()).resolves.toEqual(statusPage);
		await expect(taskPriorityService.getTaskPrioritiesList()).resolves.toEqual(priorityPage);
		await expect(taskSizeService.getTaskSizes()).resolves.toEqual(sizePage);
		await expect(taskLabelService.getTaskLabelsList()).resolves.toBe(labelResponse);
		await expect(taskVersionService.getTaskVersions()).resolves.toEqual(versionPage);
		await expect(issueTypeService.getIssueTypeList()).resolves.toBe(issueResponse);
		await expect(taskRelatedIssueTypeService.getTaskRelatedIssueTypeList()).resolves.toBe(relatedResponse);

		expect(statusGet).toHaveBeenCalledWith(
			'/task-statuses?tenantId=cookie-tenant&organizationId=cookie-organization&organizationTeamId=cookie-team',
			{ tenantId: 'cookie-tenant' }
		);
		expect(priorityGet).toHaveBeenCalledWith(
			'/task-priorities?tenantId=cookie-tenant&organizationId=cookie-organization&organizationTeamId=cookie-team',
			{ tenantId: 'cookie-tenant' }
		);
		expect(sizeGet).toHaveBeenCalledWith(
			'/task-sizes?tenantId=cookie-tenant&organizationId=cookie-organization&organizationTeamId=cookie-team'
		);
		expect(labelGet).toHaveBeenCalledWith(
			'/tags/level?tenantId=cookie-tenant&organizationId=cookie-organization&organizationTeamId=cookie-team',
			{ tenantId: 'cookie-tenant' }
		);
		expect(versionGet).toHaveBeenCalledWith(
			'/task-versions?organizationTeamId=cookie-team&organizationId=cookie-organization&tenantId=cookie-tenant',
			{ tenantId: 'cookie-tenant' }
		);
		expect(issueGet).toHaveBeenCalledWith(
			'/issue-types?tenantId=cookie-tenant&organizationId=cookie-organization&organizationTeamId=cookie-team',
			{ tenantId: 'cookie-tenant' }
		);
		expect(relatedGet).toHaveBeenCalledWith(
			'/task-related-issue-types?tenantId=cookie-tenant&organizationId=cookie-organization&organizationTeamId=cookie-team',
			{ tenantId: 'cookie-tenant' }
		);
	});

	it('uses captured tenant/organization/project, omits missing team, and never project-scopes labels', async () => {
		const capturedScope: TaskMetadataScope = {
			tenantId: 'old-tenant',
			organizationId: 'old-organization',
			projectId: 'old-project'
		};
		const response = axiosResponse({ items: [], total: 0 });
		const statusGet = jest.spyOn(taskStatusService, 'get').mockResolvedValue(response as never);
		const priorityGet = jest.spyOn(taskPriorityService, 'get').mockResolvedValue(response as never);
		const sizeGet = jest.spyOn(taskSizeService, 'get').mockResolvedValue(response as never);
		const labelGet = jest.spyOn(taskLabelService, 'get').mockResolvedValue(response as never);
		const versionGet = jest.spyOn(taskVersionService, 'get').mockResolvedValue(response as never);
		const issueGet = jest.spyOn(issueTypeService, 'get').mockResolvedValue(response as never);
		const relatedGet = jest.spyOn(taskRelatedIssueTypeService, 'get').mockResolvedValue(response as never);

		await taskStatusService.getTaskStatuses(capturedScope);
		await taskPriorityService.getTaskPrioritiesList(capturedScope);
		await taskSizeService.getTaskSizes(capturedScope);
		await taskLabelService.getTaskLabelsList(capturedScope);
		await taskVersionService.getTaskVersions(capturedScope);
		await issueTypeService.getIssueTypeList(capturedScope);
		await taskRelatedIssueTypeService.getTaskRelatedIssueTypeList(capturedScope);

		const scopedSuffix = 'tenantId=old-tenant&organizationId=old-organization&projectId=old-project';
		expect(statusGet).toHaveBeenCalledWith(`/task-statuses?${scopedSuffix}`, { tenantId: 'old-tenant' });
		expect(priorityGet).toHaveBeenCalledWith(`/task-priorities?${scopedSuffix}`, { tenantId: 'old-tenant' });
		expect(sizeGet).toHaveBeenCalledWith(`/task-sizes?${scopedSuffix}`, { tenantId: 'old-tenant' });
		expect(versionGet).toHaveBeenCalledWith(`/task-versions?${scopedSuffix}`, { tenantId: 'old-tenant' });
		expect(issueGet).toHaveBeenCalledWith(`/issue-types?${scopedSuffix}`, { tenantId: 'old-tenant' });
		expect(relatedGet).toHaveBeenCalledWith(`/task-related-issue-types?${scopedSuffix}`, {
			tenantId: 'old-tenant'
		});
		expect(labelGet).toHaveBeenCalledWith('/tags/level?tenantId=old-tenant&organizationId=old-organization', {
			tenantId: 'old-tenant'
		});
		[statusGet, priorityGet, sizeGet, labelGet, versionGet, issueGet, relatedGet].forEach((get) => {
			expect(get.mock.calls[0][0]).not.toContain('cookie-');
			expect(get.mock.calls[0][0]).not.toContain('organizationTeamId=');
		});
		expect(labelGet.mock.calls[0][0]).not.toContain('projectId=');
	});
});

describe('task metadata query keys', () => {
	it.each([
		['taskStatuses', 'task-statuses'],
		['taskPriorities', 'task-priorities'],
		['taskSizes', 'task-sizes'],
		['taskLabels', 'task-labels'],
		['taskVersions', 'task-versions'],
		['issueTypes', 'issue-types'],
		['taskRelatedIssueTypes', 'task-related-issue-types']
	] as const)('adds a fixed-position %s.byScope key', (namespace, root) => {
		expect(queryKeys[namespace].byScope(scope)).toEqual([
			root,
			'by-scope',
			'captured-tenant',
			'captured-organization',
			'captured-team',
			'captured-project'
		]);
		expect(
			queryKeys[namespace].byScope({
				tenantId: 'tenant-only',
				organizationId: 'organization-only'
			})
		).toEqual([root, 'by-scope', 'tenant-only', 'organization-only', null, null]);
	});

	it('builds the bootstrap key from fixed scope positions and a canonical include string', () => {
		expect(queryKeys.taskMetadata.bootstrap(scope, ['taskVersions', 'issueTypes', 'taskVersions'])).toEqual([
			'task-metadata',
			'bootstrap',
			'captured-tenant',
			'captured-organization',
			'captured-team',
			'captured-project',
			'issueTypes,taskVersions'
		]);
		expect(
			queryKeys.taskMetadata.bootstrap(
				{ tenantId: 'tenant-only', organizationId: 'organization-only' },
				undefined
			)
		).toEqual([
			'task-metadata',
			'bootstrap',
			'tenant-only',
			'organization-only',
			null,
			null,
			canonicalAll.join(',')
		]);
	});

	it('keeps every existing metadata byTeam result unchanged', () => {
		expect(queryKeys.taskStatuses.byTeam('team-1')).toEqual(['task-statuses', 'by-team', 'team-1']);
		expect(queryKeys.taskPriorities.byTeam('team-1')).toEqual(['task-priorities', 'by-team', 'team-1']);
		expect(queryKeys.taskSizes.byTeam('team-1')).toEqual(['task-sizes', 'by-team', 'team-1']);
		expect(queryKeys.taskLabels.byTeam('team-1')).toEqual(['task-labels', 'by-team', 'team-1']);
		expect(queryKeys.taskVersions.byTeam('team-1')).toEqual(['task-versions', 'by-team', 'team-1']);
		expect(queryKeys.issueTypes.byTeam('team-1')).toEqual(['issue-types', 'by-team', 'team-1']);
		expect(queryKeys.taskRelatedIssueTypes.byTeam('team-1')).toEqual([
			'task-related-issue-types',
			'by-team',
			'team-1'
		]);
		expect(queryKeys.taskStatuses.byTeam(null)).toEqual(['task-statuses', 'by-team']);
		expect(queryKeys.taskPriorities.byTeam(null)).toEqual(['task-priorities', 'by-team']);
		expect(queryKeys.taskSizes.byTeam(null)).toEqual(['task-sizes', 'by-team']);
		expect(queryKeys.taskLabels.byTeam(null)).toEqual(['task-labels', 'by-team']);
		expect(queryKeys.taskVersions.byTeam(null)).toEqual(['task-versions', 'by-team']);
		expect(queryKeys.issueTypes.byTeam(null)).toEqual(['issue-types', 'by-team']);
		expect(queryKeys.taskRelatedIssueTypes.byTeam(null)).toEqual(['task-related-issue-types', 'by-team']);
	});
});
