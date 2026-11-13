/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import type { TStatus } from '@/core/types/interfaces/task/task-card';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockHandleStatusUpdate = jest.fn();

// The menu's own state: what is picked reaches the hook's `onValueChange` as the menu calls it.
jest.mock('@/core/hooks', () => ({
	useUpdateTask: () => ({ handleStatusUpdate: (...args: unknown[]) => mockHandleStatusUpdate(...args) }),
	useSyncRef: <T,>(value: T) => ({ current: value }),
	useStatusValue: ({ onValueChange }: { onValueChange: (value: string) => void }) => ({
		item: undefined,
		items: [],
		onChange: (value: string) => onValueChange(value)
	})
}));
jest.mock('@/core/lib/utils/task.utils', () => ({
	taskUpdateQueue: { task: (run: (arg: unknown) => unknown, arg: unknown) => run(arg) }
}));
jest.mock('@/core/stores', () => ({ activeTeamTaskState: 'active-team-task' }));
jest.mock('@/core/stores/tasks/task-optimistic-updates', () => ({
	setOptimisticValueAtom: 'set-optimistic',
	clearOptimisticValueAtom: 'clear-optimistic',
	getOptimisticValueAtom: 'get-optimistic'
}));
jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => (atom === 'get-optimistic' ? () => undefined : null),
	useSetAtom: () => jest.fn()
}));
jest.mock('./use-task-labels-query', () => ({ useTaskLabelsQuery: () => ({ taskLabels: [] }) }));
jest.mock('./use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({ taskStatuses: [{ id: 's-open', name: 'open', value: 'open' }] })
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/core/lib/utils/error-feedback', () => ({ errorReasonKeyOf: () => 'reason' }));

import { useActiveTaskStatus } from './use-active-task-status';

/** The menu's items, keyed as `useMapToTaskStatusValues` keys them: by their record's value, else its name. */
const priorities = {
	p0: { id: 'p-0', name: 'P0', value: 'p0' },
	high: { id: 'p-high', name: 'High', value: 'high' },
	Shared: { id: 'p-shared', name: 'Shared' }
} as unknown as TStatus<string>;

const task = {
	id: 't1',
	title: 'Ship',
	priority: 'low',
	taskPriorityId: 'p-low',
	size: null,
	taskSizeId: null
} as unknown as TTask;

describe('a priority or a size picked from a task’s own menu (task page, drawer, timer)', () => {
	beforeEach(() => {
		mockHandleStatusUpdate.mockReset().mockResolvedValue(undefined);
	});

	it('is saved with the record the menu lists it by, a team’s own included', () => {
		const { result } = renderHook(() => useActiveTaskStatus({ task }, priorities as never, 'priority'));
		act(() => result.current.onChange('p0' as never));
		expect(mockHandleStatusUpdate).toHaveBeenLastCalledWith('p0', 'priority', undefined, task, true, 'p-0');

		act(() => result.current.onChange('Shared' as never));
		expect(mockHandleStatusUpdate).toHaveBeenLastCalledWith(
			'Shared',
			'priority',
			undefined,
			task,
			true,
			'p-shared'
		);
	});

	it('clears the record when the menu lists none for the name', () => {
		const { result } = renderHook(() => useActiveTaskStatus({ task }, priorities as never, 'size'));
		act(() => result.current.onChange('tiny' as never));
		expect(mockHandleStatusUpdate).toHaveBeenLastCalledWith('tiny', 'size', undefined, task, true, null);
	});

	it('saves a status by its own record, as before', () => {
		const { result } = renderHook(() => useActiveTaskStatus({ task }, {} as never, 'status'));
		act(() => result.current.onChange('open' as never));
		expect(mockHandleStatusUpdate).toHaveBeenLastCalledWith('open', 'status', 's-open', task, true, undefined);
	});
});
