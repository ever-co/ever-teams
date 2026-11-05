/**
 * The task settings hooks file a new priority, size, version or issue type under the active team, and send every
 * write with the session's token. A screen calling them stays mounted while the user switches teams or the token is
 * refreshed, so their callbacks must read the store as it is at the write, not as it was at the first render.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import {
	createIssueTypeRequest,
	deleteIssueTypesRequest,
	editIssueTypesRequest
} from '../../client/requests/issue-type';
import {
	createPriorityRequest,
	deleteTaskPriorityRequest,
	updateTaskPriorityRequest
} from '../../client/requests/task-priority';
import { createSizeRequest, deleteTaskSizeRequest, updateTaskSizesRequest } from '../../client/requests/task-size';
import {
	createVersionRequest,
	deleteTaskVersionRequest,
	editTaskVersionRequest
} from '../../client/requests/task-version';
import { IIssueTypesItemList } from '../../interfaces/ITaskIssue';
import { useTaskIssue } from './use-task-issue';
import { useTaskPriority } from './use-task-priority';
import { useTaskSizes } from './use-task-sizes';
import { useTaskVersion } from './use-task-version';

let mockStores: Record<string, unknown> = {};

jest.mock('../../../models', () => ({
	useStores: () => mockStores
}));

// The lists are read by queries of their own: these hooks are only asked to write here
jest.mock('../../client/queries/task/task-priority', () => ({
	__esModule: true,
	default: () => ({ data: undefined, isLoading: false, isSuccess: false, isRefetching: false })
}));
jest.mock('../../client/queries/task/task-sizes', () => ({
	__esModule: true,
	default: () => ({ data: undefined, isLoading: false, isSuccess: false, isRefetching: false })
}));
jest.mock('../../client/queries/task/task-version', () => ({
	__esModule: true,
	default: () => ({ data: undefined, isLoading: false, isSuccess: false, isRefetching: false })
}));
jest.mock('../../client/queries/task/task-issue', () => ({
	__esModule: true,
	default: () => ({ data: undefined, isLoading: false, isSuccess: false, isRefetching: false })
}));

jest.mock('../../client/requests/task-priority', () => ({
	createPriorityRequest: jest.fn(),
	deleteTaskPriorityRequest: jest.fn(),
	updateTaskPriorityRequest: jest.fn()
}));
jest.mock('../../client/requests/task-size', () => ({
	createSizeRequest: jest.fn(),
	deleteTaskSizeRequest: jest.fn(),
	updateTaskSizesRequest: jest.fn()
}));
jest.mock('../../client/requests/task-version', () => ({
	createVersionRequest: jest.fn(),
	deleteTaskVersionRequest: jest.fn(),
	editTaskVersionRequest: jest.fn()
}));
jest.mock('../../client/requests/issue-type', () => ({
	createIssueTypeRequest: jest.fn(),
	deleteIssueTypesRequest: jest.fn(),
	editIssueTypesRequest: jest.fn()
}));

const TENANT = 'tenant-1';

type TSession = { authToken: string; organizationId: string; activeTeamId: string };

/** The session the screen first renders with. */
const FIRST_SESSION: TSession = { authToken: 'token-1', organizationId: 'organization-1', activeTeamId: 'team-1' };

/** The user switched to a team of another organization: the token stays. */
const TEAM_SWITCHED: TSession = { ...FIRST_SESSION, organizationId: 'organization-2', activeTeamId: 'team-2' };

/** The token was refreshed: the team stays. */
const TOKEN_REFRESHED: TSession = { ...FIRST_SESSION, authToken: 'token-2' };

/** The fields the hooks add to a row of the team switched to: its organization and the team itself. */
const SWITCHED_TEAM_FIELDS = { organizationId: 'organization-2', organizationTeamId: 'team-2' };

function givenSession({ authToken, organizationId, activeTeamId }: TSession) {
	mockStores = {
		authenticationStore: { authToken, tenantId: TENANT, organizationId },
		teamStore: { activeTeamId }
	};
}

/** Renders the hook in the first session, then renders it again in the next one, as the observer screen does. */
async function renderThenChange<T>(useHook: () => T, nextSession: TSession) {
	givenSession(FIRST_SESSION);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result, rerender } = await renderHook(useHook, { wrapper });

	givenSession(nextSession);
	await rerender({});

	return result;
}

describe('task settings writes after the session changes under a mounted screen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('useTaskVersion', () => {
		it('files a new version under the team switched to', async () => {
			const result = await renderThenChange(() => useTaskVersion(), TEAM_SWITCHED);

			await act(async () => {
				await result.current.createTaskVersion({ name: 'v2' });
			});

			expect(createVersionRequest).toHaveBeenCalledWith(
				{ name: 'v2', ...SWITCHED_TEAM_FIELDS },
				'token-1',
				TENANT
			);
		});

		it('saves an edited version under the team switched to', async () => {
			const result = await renderThenChange(() => useTaskVersion(), TEAM_SWITCHED);

			await act(async () => {
				await result.current.updateTaskVersion('version-1', { name: 'v2' });
			});

			expect(editTaskVersionRequest).toHaveBeenCalledWith({
				id: 'version-1',
				datas: { name: 'v2', ...SWITCHED_TEAM_FIELDS },
				bearer_token: 'token-1',
				tenantId: TENANT
			});
		});

		it('deletes a version with the refreshed token', async () => {
			const result = await renderThenChange(() => useTaskVersion(), TOKEN_REFRESHED);

			await act(async () => {
				await result.current.deleteTaskVersion('version-1');
			});

			expect(deleteTaskVersionRequest).toHaveBeenCalledWith({
				id: 'version-1',
				bearer_token: 'token-2',
				tenantId: TENANT
			});
		});
	});

	describe('useTaskSizes', () => {
		it('files a new size under the team switched to', async () => {
			const result = await renderThenChange(() => useTaskSizes(), TEAM_SWITCHED);

			await act(async () => {
				await result.current.createSize({ name: 'large' });
			});

			expect(createSizeRequest).toHaveBeenCalledWith({
				tenantId: TENANT,
				datas: { name: 'large', ...SWITCHED_TEAM_FIELDS },
				bearer_token: 'token-1'
			});
		});

		it('updates and deletes a size with the refreshed token', async () => {
			const result = await renderThenChange(() => useTaskSizes(), TOKEN_REFRESHED);

			await act(async () => {
				await result.current.updateSize('size-1', { name: 'small' });
				await result.current.deleteSize('size-1');
			});

			expect(updateTaskSizesRequest).toHaveBeenCalledWith({
				id: 'size-1',
				tenantId: TENANT,
				datas: { name: 'small' },
				bearer_token: 'token-2'
			});
			expect(deleteTaskSizeRequest).toHaveBeenCalledWith({
				id: 'size-1',
				tenantId: TENANT,
				bearer_token: 'token-2'
			});
		});
	});

	describe('useTaskPriority', () => {
		it('files a new priority under the team switched to', async () => {
			const result = await renderThenChange(() => useTaskPriority(), TEAM_SWITCHED);

			await act(async () => {
				await result.current.createPriority({ name: 'urgent' });
			});

			expect(createPriorityRequest).toHaveBeenCalledWith({
				tenantId: TENANT,
				datas: { name: 'urgent', ...SWITCHED_TEAM_FIELDS },
				bearer_token: 'token-1'
			});
		});

		it('updates and deletes a priority with the refreshed token', async () => {
			const result = await renderThenChange(() => useTaskPriority(), TOKEN_REFRESHED);

			await act(async () => {
				await result.current.updatePriority('priority-1', { name: 'low' });
				await result.current.deletePriority('priority-1');
			});

			expect(updateTaskPriorityRequest).toHaveBeenCalledWith({
				id: 'priority-1',
				tenantId: TENANT,
				datas: { name: 'low' },
				bearer_token: 'token-2'
			});
			expect(deleteTaskPriorityRequest).toHaveBeenCalledWith({
				id: 'priority-1',
				tenantId: TENANT,
				bearer_token: 'token-2'
			});
		});
	});

	describe('useTaskIssue', () => {
		const ISSUE_TYPE = { id: 'issue-type-1', name: 'bug' } as unknown as IIssueTypesItemList;

		it('files a new issue type under the team switched to', async () => {
			const result = await renderThenChange(() => useTaskIssue(), TEAM_SWITCHED);

			await act(async () => {
				await result.current.createIssue(ISSUE_TYPE);
			});

			expect(createIssueTypeRequest).toHaveBeenCalledWith({
				datas: { ...ISSUE_TYPE, ...SWITCHED_TEAM_FIELDS },
				tenantId: TENANT,
				bearer_token: 'token-1'
			});
		});

		it('updates and deletes an issue type with the refreshed token', async () => {
			const result = await renderThenChange(() => useTaskIssue(), TOKEN_REFRESHED);

			await act(async () => {
				await result.current.updateIssue('issue-type-1', ISSUE_TYPE);
				await result.current.deleteIssue('issue-type-1');
			});

			expect(editIssueTypesRequest).toHaveBeenCalledWith({
				id: 'issue-type-1',
				tenantId: TENANT,
				datas: ISSUE_TYPE,
				bearer_token: 'token-2'
			});
			expect(deleteIssueTypesRequest).toHaveBeenCalledWith({
				id: 'issue-type-1',
				tenantId: TENANT,
				bearer_token: 'token-2'
			});
		});
	});
});
