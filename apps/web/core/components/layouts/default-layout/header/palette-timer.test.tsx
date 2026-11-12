/** @jest-environment jsdom */

import React from 'react';
import { render } from '@testing-library/react';

import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();
const mockStartTimerWithTask = jest.fn(() => Promise.resolve());

const taskOf = (id: string) => ({ id, title: id, status: 'open' }) as TTask;
const TASK = taskOf('task-asked');
const OTHER_TASK = taskOf('task-other');

/** What the task's card knows of the timer, as `useTimerButtonLogic` gives it. */
function timerButtonOf(overrides: Record<string, unknown>) {
	return {
		activeTaskStatus: { running: false },
		activeTeamTask: TASK,
		disabled: false,
		canTrack: true,
		startTimer: mockStartTimer,
		stopTimer: mockStopTimer,
		startTimerWithTask: mockStartTimerWithTask,
		// The card's main Start: it names no task, so the timer starts the page's task or the active one
		startStopTimerHandler: () => mockStartTimer(),
		modals: {},
		...overrides
	};
}

let mockTimerButton = timerButtonOf({});

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { info: jest.fn(), warning: jest.fn() } }));
jest.mock('@/core/components/common/command', () => ({
	CommandGroup: () => null,
	CommandItem: () => null,
	commandIconTileClass: ''
}));
jest.mock('@/core/components/common/skeleton/calendar-component-skeletons', () => ({
	AddManualTimeModalSkeleton: () => null
}));
jest.mock('@/core/components/features/daily-plan/timer-plan-dialogs', () => ({ TimerPlanDialogs: () => null }));
jest.mock('@/core/components/icons', () => ({ Play: () => null }));
jest.mock('@/core/components/optimized-components/calendar', () => ({ LazyAddManualTimeModal: () => null }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { isEmailVerified: true } })
}));
jest.mock('@/core/hooks/timer', () => ({
	useTimerActions: () => ({ startTimer: jest.fn(), stopTimer: jest.fn() })
}));
jest.mock('@/core/hooks/timer/use-timer-plan-status', () => ({
	useTimerPlanStatus: () => ({ canRunTimer: true, timerStatus: null })
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
jest.mock('@/core/hooks/tasks/use-timer-button', () => ({ useTimerButtonLogic: () => mockTimerButton }));
// The main Start of a stopped timer that may run: it starts through the `startTimer` it was given
jest.mock('@/core/hooks/activities/use-start-stop-timer-handler', () => ({
	useStartStopTimerHandler: ({ startTimer }: { startTimer: () => unknown }) => ({
		modals: {},
		startStopTimerHandler: () => startTimer()
	})
}));

import { PaletteTimerLayer } from './palette-timer';

function renderStartOf(task: TTask) {
	const timer = {
		canStart: true,
		canStop: false,
		stopTimer: jest.fn(),
		startTimerOn: jest.fn(),
		openAddTime: jest.fn(),
		request: { id: 1, kind: 'start' as const, task },
		addTimeModal: { isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }
	};
	return render(<PaletteTimerLayer timer={timer} />);
}

describe('a timer start asked from the palette', () => {
	afterEach(() => {
		mockTimerButton = timerButtonOf({});
	});

	it('names the task asked for when it goes through the main Start, so a task page does not start its own', () => {
		renderStartOf(TASK);

		expect(mockStartTimer).toHaveBeenCalledTimes(1);
		expect(mockStartTimer).toHaveBeenCalledWith(TASK);
		expect(mockStartTimerWithTask).not.toHaveBeenCalled();
	});

	it("starts a task that is not the active one through its card's start", () => {
		mockTimerButton = timerButtonOf({ activeTaskStatus: undefined, activeTeamTask: OTHER_TASK });

		renderStartOf(TASK);

		expect(mockStartTimerWithTask).toHaveBeenCalledTimes(1);
		expect(mockStartTimer).not.toHaveBeenCalled();
	});
});
