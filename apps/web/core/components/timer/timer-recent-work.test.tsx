/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from '@testing-library/react';

import type { RecentTask } from '@/core/lib/utils/time-entry-reuse';
import type { TTask } from '@/core/types/schemas/task/task.schema';

interface RecentWorkState {
	recentTasks: RecentTask[];
	isLoading: boolean;
	isError: boolean;
	retry: jest.Mock;
}

let mockRecentWork: RecentWorkState;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('@/core/hooks/timer/use-recent-work', () => ({
	useRecentWork: () => mockRecentWork
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));

import { TimerRecentWork } from './timer-recent-work';

function recentOf(id: string, title: string, projectName: string | null): RecentTask {
	const task = { id, title, taskNumber: `T-${id}`, status: 'in-progress' } as unknown as TTask;
	return { task, projectName, projectColor: null, projectImageUrl: null };
}

function stateOf(overrides: Partial<RecentWorkState> = {}): RecentWorkState {
	return { recentTasks: [], isLoading: false, isError: false, retry: jest.fn(), ...overrides };
}

describe('TimerRecentWork', () => {
	it('lists the recent tasks, each with its number and its project, and starts the timer on the one clicked', () => {
		const diary = recentOf('1', 'Write the diary', 'Website');
		const login = recentOf('2', 'Fix the login', null);
		mockRecentWork = stateOf({ recentTasks: [diary, login] });
		const onStart = jest.fn();

		render(<TimerRecentWork onStart={onStart} />);

		const block = screen.getByRole('region', { name: 'timeEntryActions.recent.TITLE' });
		const rows = within(block).getAllByRole('button');
		expect(rows).toHaveLength(2);
		expect(within(rows[0]).getByText('Write the diary')).toBeTruthy();
		expect(within(rows[0]).getByText('#T-1')).toBeTruthy();
		expect(within(rows[0]).getByText('Website')).toBeTruthy();

		const loginRow = screen.getByRole('button', {
			name: 'timeEntryActions.recent.START_ON:{"task":"Fix the login"}'
		});
		fireEvent.click(loginRow);

		expect(onStart).toHaveBeenCalledWith(login.task);
	});

	it('shows no block at all to a member who tracked nothing lately', () => {
		mockRecentWork = stateOf();

		render(<TimerRecentWork onStart={jest.fn()} />);

		expect(screen.queryByRole('region')).toBeNull();
		expect(screen.queryByText('timeEntryActions.recent.TITLE')).toBeNull();
	});

	it('holds its place while the entries are read', () => {
		mockRecentWork = stateOf({ isLoading: true });

		render(<TimerRecentWork onStart={jest.fn()} />);

		const block = screen.getByRole('region', { name: 'timeEntryActions.recent.TITLE' });
		expect(block.getAttribute('aria-busy')).toBe('true');
		expect(within(block).queryAllByRole('button')).toHaveLength(0);
	});

	it('says the recent tasks could not be loaded, and tries again on request', () => {
		mockRecentWork = stateOf({ isError: true });

		render(<TimerRecentWork onStart={jest.fn()} />);

		expect(screen.getByRole('alert').textContent).toContain('timeEntryActions.recent.ERROR');
		fireEvent.click(screen.getByRole('button', { name: 'timeEntryActions.recent.RETRY' }));

		expect(mockRecentWork.retry).toHaveBeenCalledTimes(1);
	});
});
