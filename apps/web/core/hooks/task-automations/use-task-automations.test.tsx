/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { queryKeys } from '@/core/query/keys';
import { ETaskAutomationAction, ETaskAutomationTrigger, type ITaskAutomationRule } from '@/core/types/interfaces/common/task-automation';

const mockFlag = { on: true };
const mockService = {
	templates: jest.fn(),
	list: jest.fn(),
	runs: jest.fn(),
	create: jest.fn(),
	update: jest.fn(),
	reorder: jest.fn(),
	remove: jest.fn(),
	test: jest.fn()
};

jest.mock('@/core/lib/utils/task-automations-enabled', () => ({ isTaskAutomationsEnabled: () => mockFlag.on }));
jest.mock('@/core/services/client/api/task-automations', () => ({
	get taskAutomationsService() {
		return mockService;
	}
}));
jest.mock('@/core/stores/teams/organization-team', () => {
	const { atom } = jest.requireActual('jotai');
	return { activeTeamState: atom({ id: 'team-1', tenantId: 'tenant-1', organizationId: 'org-1' }) };
});
jest.mock('@/core/stores/user/user', () => {
	const { atom } = jest.requireActual('jotai');
	return { userState: atom({ id: 'user-1', tenantId: 'tenant-1' }) };
});

import {
	availabilityOfError,
	shouldRetryProbe,
	useTaskAutomationActions,
	useTaskAutomationRules,
	useTaskAutomationsAvailability
} from './use-task-automations';

const rule = (id: string, position: number, overrides: Partial<ITaskAutomationRule> = {}): ITaskAutomationRule => ({
	id,
	name: id,
	isEnabled: true,
	position,
	trigger: { type: ETaskAutomationTrigger.TASK_ASSIGNED },
	conditions: [],
	actions: [{ type: ETaskAutomationAction.NOTIFY_ASSIGNEES }],
	...overrides
});

const httpError = (status: number) => ({ statusCode: status, message: `HTTP ${status}` });

function setup<T>(hook: () => T) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	return { queryClient, ...renderHook(hook, { wrapper }) };
}

const rulesKey = queryKeys.taskAutomations.rules('tenant-1', 'org-1', 'user-1');

beforeEach(() => {
	mockFlag.on = true;
	Object.values(mockService).forEach((fn) => fn.mockReset());
});

describe('availability', () => {
	it('reads a 404 as "not there", a 403 as "not allowed", anything else as a failure to retry', () => {
		expect(availabilityOfError(httpError(404))).toBe('unavailable');
		expect(availabilityOfError(httpError(403))).toBe('forbidden');
		expect(availabilityOfError(httpError(500))).toBe('error');
		expect(availabilityOfError(new Error('Network Error'))).toBe('error');
		expect(shouldRetryProbe(0, httpError(503))).toBe(true);
		expect(shouldRetryProbe(2, httpError(503))).toBe(false);
		expect(shouldRetryProbe(0, httpError(404))).toBe(false);
	});

	it('asks nothing while the switch is off', () => {
		mockFlag.on = false;
		const { result } = setup(() => useTaskAutomationsAvailability());
		expect(result.current.availability).toBe('off');
		expect(mockService.templates).not.toHaveBeenCalled();
	});

	it('asks nothing for a person who could not see the entry', () => {
		const { result } = setup(() => useTaskAutomationsAvailability(false));
		expect(result.current.availability).toBe('loading');
		expect(mockService.templates).not.toHaveBeenCalled();
	});

	it('is available when the platform answers the templates, with the organization', async () => {
		mockService.templates.mockResolvedValue([{ key: 'close-parent-when-subtasks-done' }]);
		const { result } = setup(() => useTaskAutomationsAvailability());
		await waitFor(() => expect(result.current.availability).toBe('available'));
		expect(result.current.templates).toHaveLength(1);
		expect(mockService.templates).toHaveBeenCalledWith('org-1', expect.anything());
	});

	it('hides on a 404 and says "not allowed" on a 403', async () => {
		mockService.templates.mockRejectedValue(httpError(404));
		const missing = setup(() => useTaskAutomationsAvailability());
		await waitFor(() => expect(missing.result.current.availability).toBe('unavailable'));

		mockService.templates.mockRejectedValue(httpError(403));
		const refused = setup(() => useTaskAutomationsAvailability());
		await waitFor(() => expect(refused.result.current.availability).toBe('forbidden'));
	});
});

describe('rules', () => {
	it('lists the rules in the platform’s order, only when asked to', async () => {
		mockService.list.mockResolvedValue([rule('b', 1), rule('a', 0)]);
		const idle = setup(() => useTaskAutomationRules(false));
		expect(idle.result.current.rules).toEqual([]);
		expect(mockService.list).not.toHaveBeenCalled();

		const { result } = setup(() => useTaskAutomationRules(true));
		await waitFor(() => expect(result.current.rules.map((one) => one.id)).toEqual(['a', 'b']));
	});
});

describe('actions', () => {
	it('switches a rule at once, and puts it back when the platform refuses', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0)]);
		let refuse!: (error: unknown) => void;
		mockService.update.mockReturnValue(new Promise((_resolve, reject) => (refuse = reject)));
		let settled: Promise<unknown> = Promise.resolve();
		act(() => {
			settled = result.current.setEnabled('a', false).catch(() => undefined);
		});
		await waitFor(() => expect(queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey)?.[0].isEnabled).toBe(false));
		expect(mockService.update).toHaveBeenCalledWith('org-1', 'a', { isEnabled: false });
		await act(async () => {
			refuse(httpError(500));
			await settled;
		});
		expect(queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey)?.[0].isEnabled).toBe(true);
	});

	it('puts back only the switch that failed: one saved meanwhile keeps its result', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0), rule('b', 1)]);
		let refuseA!: (error: unknown) => void;
		mockService.update.mockImplementation((_organizationId: string, id: string) =>
			id === 'a' ? new Promise((_resolve, reject) => (refuseA = reject)) : Promise.resolve(rule('b', 1, { isEnabled: false }))
		);
		let settledA: Promise<unknown> = Promise.resolve();
		await act(async () => {
			settledA = result.current.setEnabled('a', false).catch(() => undefined);
			await result.current.setEnabled('b', false);
		});
		await act(async () => {
			refuseA(httpError(500));
			await settledA;
		});
		const cached = queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey) ?? [];
		expect(cached.map((one) => [one.id, one.isEnabled])).toEqual([
			['a', true],
			['b', false]
		]);
	});

	it('puts a refused order back, keeping what other writes made of each rule', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0), rule('b', 1)]);
		let refuse!: (error: unknown) => void;
		mockService.reorder.mockReturnValue(new Promise((_resolve, reject) => (refuse = reject)));
		let settled: Promise<unknown> = Promise.resolve();
		act(() => {
			settled = result.current.reorder(['b', 'a']).catch(() => undefined);
		});
		await waitFor(() => expect(queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey)?.map((one) => one.id)).toEqual(['b', 'a']));
		// A switch saved while the order was under way.
		queryClient.setQueryData<ITaskAutomationRule[]>(rulesKey, (rules) => rules?.map((one) => (one.id === 'b' ? { ...one, isEnabled: false } : one)));
		await act(async () => {
			refuse(httpError(500));
			await settled;
		});
		const cached = queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey) ?? [];
		expect(cached.map((one) => [one.id, one.isEnabled])).toEqual([
			['a', true],
			['b', false]
		]);
	});

	it('keeps a reorder made while a switch was under way', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0), rule('b', 1)]);
		let answerSwitch!: (value: ITaskAutomationRule) => void;
		mockService.update.mockReturnValue(new Promise((resolve) => (answerSwitch = resolve)));
		mockService.reorder.mockResolvedValue([rule('b', 0), rule('a', 1)]);
		let switched: Promise<unknown> = Promise.resolve();
		await act(async () => {
			switched = result.current.setEnabled('a', false);
			await result.current.reorder(['b', 'a']);
		});
		// The switch answers late, with the position the rule had when it was read.
		await act(async () => {
			answerSwitch(rule('a', 0, { isEnabled: false }));
			await switched;
		});
		const cached = queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey) ?? [];
		expect(cached.map((one) => [one.id, one.position, one.isEnabled])).toEqual([
			['b', 0, true],
			['a', 1, false]
		]);
	});

	it('reads the rules again once, when the last of two writes settling together is done', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0), rule('b', 1)]);
		const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
		const answers: Array<(value: ITaskAutomationRule) => void> = [];
		mockService.update.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
		let both: Promise<unknown> = Promise.resolve();
		act(() => {
			both = Promise.all([result.current.setEnabled('a', false), result.current.setEnabled('b', false)]);
		});
		await waitFor(() => expect(answers).toHaveLength(2));
		expect(invalidate).not.toHaveBeenCalled();
		await act(async () => {
			answers[0](rule('a', 0, { isEnabled: false }));
			answers[1](rule('b', 1, { isEnabled: false }));
			await both;
		});
		expect(invalidate.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(rulesKey))).toHaveLength(1);
	});

	it('drops a read under way before an edit lands, so the old list cannot replace it', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0)]);
		let answerRead!: (rules: ITaskAutomationRule[]) => void;
		const read = queryClient
			.fetchQuery({ queryKey: rulesKey, queryFn: () => new Promise<ITaskAutomationRule[]>((resolve) => (answerRead = resolve)) })
			.catch(() => undefined);
		mockService.update.mockResolvedValue(rule('a', 0, { name: 'Renamed' }));
		await act(async () => {
			await result.current.update('a', { name: 'Renamed' });
		});
		await act(async () => {
			answerRead([rule('a', 0)]);
			await read;
		});
		expect(queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey)?.[0].name).toBe('Renamed');
	});

	it('reorders at once and keeps the platform’s answer', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0), rule('b', 1)]);
		mockService.reorder.mockResolvedValue([rule('b', 0), rule('a', 1)]);
		await act(async () => {
			await result.current.reorder(['b', 'a']);
		});
		expect(mockService.reorder).toHaveBeenCalledWith('org-1', ['b', 'a']);
		expect(queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey)?.map((one) => one.id)).toEqual(['b', 'a']);
	});

	it('creates, edits and deletes in the cached list, and runs a dry run', async () => {
		const { result, queryClient } = setup(() => useTaskAutomationActions());
		queryClient.setQueryData(rulesKey, [rule('a', 0)]);
		mockService.create.mockResolvedValue(rule('b', 1));
		await act(async () => {
			await result.current.create({ templateKey: 'due-date-notify-assignees' });
		});
		expect(mockService.create).toHaveBeenCalledWith('org-1', { templateKey: 'due-date-notify-assignees' });
		mockService.update.mockResolvedValue(rule('a', 0, { name: 'Renamed' }));
		await act(async () => {
			await result.current.update('a', { name: 'Renamed' });
		});
		mockService.remove.mockResolvedValue(undefined);
		await act(async () => {
			await result.current.remove('b');
		});
		expect(queryClient.getQueryData<ITaskAutomationRule[]>(rulesKey)?.map((one) => [one.id, one.name])).toEqual([['a', 'Renamed']]);

		mockService.test.mockResolvedValue({ outcome: 'APPLIED' });
		let answer: unknown;
		await act(async () => {
			answer = await result.current.test('a', 'task-1');
		});
		expect(mockService.test).toHaveBeenCalledWith('org-1', 'a', 'task-1');
		expect(answer).toEqual({ outcome: 'APPLIED' });
	});
});
