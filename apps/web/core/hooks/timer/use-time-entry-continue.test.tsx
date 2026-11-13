/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState, teamTasksState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

let mockUser: Record<string, unknown> | undefined;

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));

import { useTimeEntryContinue } from './use-time-entry-continue';

type JotaiStore = ReturnType<typeof createStore>;

const TASK = { id: 'task-1', title: 'Write the diary', status: 'in-progress' };

function entryOf(extra: Record<string, unknown> = {}): ITimeLog {
	return {
		id: 'log-1',
		employeeId: 'employee-1',
		taskId: 'task-1',
		isBillable: true,
		description: 'Review the invoices',
		startedAt: new Date(2026, 10, 11, 9),
		stoppedAt: new Date(2026, 10, 11, 10),
		...extra
	} as unknown as ITimeLog;
}

function memberOf(isTrackingEnabled: boolean) {
	return { id: 'member-1', employeeId: 'employee-1', isTrackingEnabled, employee: { userId: 'user-1' } };
}

function storeWith(member: ReturnType<typeof memberOf>, tasks: unknown[] = [TASK]): JotaiStore {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-1', name: 'Team', members: [member] }] as never);
	store.set(activeTeamIdState, 'team-1');
	store.set(teamTasksState, tasks as never);
	return store;
}

function renderContinue(store: JotaiStore) {
	const startOn = jest.fn();
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useTimeEntryContinue(startOn), { wrapper });
	return { ...view, startOn };
}

beforeEach(() => {
	mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1' } };
});

describe('useTimeEntryContinue', () => {
	it("starts the timer on the task of the member's own entry, with its billable status and notes", () => {
		const { result, startOn } = renderContinue(storeWith(memberOf(true)));
		const entry = entryOf();

		expect(result.current.canContinue(entry)).toBe(true);
		act(() => result.current.continueLog(entry));

		expect(startOn).toHaveBeenCalledWith(TASK, { isBillable: true, description: 'Review the invoices' });
	});

	it('offers nothing where tracking is turned off for the member in the team', () => {
		const { result, startOn } = renderContinue(storeWith(memberOf(false)));
		const entry = entryOf();

		expect(result.current.canContinue(entry)).toBe(false);
		act(() => result.current.continueLog(entry));

		expect(startOn).not.toHaveBeenCalled();
	});

	it('offers nothing to an account that cannot start a timer yet', () => {
		mockUser = { id: 'user-1', isEmailVerified: false, employee: { id: 'employee-1' } };
		const { result } = renderContinue(storeWith(memberOf(true)));

		expect(result.current.canContinue(entryOf())).toBe(false);
	});

	it("offers nothing on a teammate's entry", () => {
		const { result } = renderContinue(storeWith(memberOf(true)));

		expect(result.current.canContinue(entryOf({ employeeId: 'employee-2' }))).toBe(false);
	});

	it('reads the team and its tasks when asked, without a new render', () => {
		const store = storeWith(memberOf(true), []);
		const { result } = renderContinue(store);
		const canContinue = result.current.canContinue;
		expect(canContinue(entryOf())).toBe(false);

		act(() => store.set(teamTasksState, [TASK] as never));

		expect(result.current.canContinue).toBe(canContinue);
		expect(canContinue(entryOf())).toBe(true);
	});
});
