/** @jest-environment jsdom */

import React, { type PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { toast } from 'sonner';

import { activeTeamIdState, timerStatusState } from '@/core/stores';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();
const mockStartTimerWithTask = jest.fn(() => Promise.resolve());
const mockRunTimerHandler = jest.fn();

const ACTIVE_TEAM = 'team-1';
const OTHER_TEAM = 'team-2';

const taskOf = (id: string) => ({ id, title: id, status: 'open' }) as TTask;
const TASK = taskOf('task-asked');
const OTHER_TASK = taskOf('task-other');

const STOPPED = { running: false } as never as ITimerStatus;
/** A timer running for the team given. The timer shows it only while that team is the active one. */
const runOf = (teamId: string) =>
	({ running: true, lastLog: { id: 'log-1', organizationTeamId: teamId } }) as never as ITimerStatus;

/** The timer status as the API gave it, a run of another team included: what the hooks below hand out. */
let mockRawTimerStatus: ITimerStatus | null = null;

/** What the task's card knows of the timer, as `useTimerButtonLogic` gives it. */
function timerButtonOf(overrides: Record<string, unknown>) {
	return {
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
	useTimerPlanStatus: () => ({ canRunTimer: true, timerStatus: mockRawTimerStatus })
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
jest.mock('@/core/hooks/tasks/use-timer-button', () => ({
	useTimerButtonLogic: () => ({ ...mockTimerButton, activeTaskStatus: mockRawTimerStatus })
}));
// The timer's own handler. Over a stopped timer that may run, it starts through the `startTimer` it was given
jest.mock('@/core/hooks/activities/use-start-stop-timer-handler', () => ({
	useStartStopTimerHandler: ({ startTimer }: { startTimer: () => unknown }) => ({
		modals: {},
		startStopTimerHandler: () => {
			mockRunTimerHandler();
			return startTimer();
		}
	})
}));

import { PaletteTimerLayer } from './palette-timer';

type PaletteRequest = { id: number; kind: 'stop' } | { id: number; kind: 'start'; task: TTask };

/** The app in the active team, with the timer status given. */
function wrapperWith(timerStatus: ITimerStatus | null) {
	const store = createStore();
	store.set(activeTeamIdState, ACTIVE_TEAM);
	store.set(timerStatusState, timerStatus);
	mockRawTimerStatus = timerStatus;
	return ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
}

function renderRequest(request: PaletteRequest, timerStatus: ITimerStatus | null) {
	const timer = {
		canStart: true,
		canStop: false,
		stopTimer: jest.fn(),
		startTimerOn: jest.fn(),
		openAddTime: jest.fn(),
		request,
		addTimeModal: { isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }
	};
	return render(<PaletteTimerLayer timer={timer} />, { wrapper: wrapperWith(timerStatus) });
}

function renderStartOf(task: TTask, timerStatus: ITimerStatus | null = STOPPED) {
	return renderRequest({ id: 1, kind: 'start', task }, timerStatus);
}

function renderStop(timerStatus: ITimerStatus | null) {
	return renderRequest({ id: 1, kind: 'stop' }, timerStatus);
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

	it('sends the active task through the main Start while the timer status is not known yet', () => {
		renderStartOf(TASK, null);

		expect(mockStartTimer).toHaveBeenCalledWith(TASK);
		expect(mockStartTimerWithTask).not.toHaveBeenCalled();
	});

	it("starts a task that is not the active one through its card's start", () => {
		mockTimerButton = timerButtonOf({ activeTeamTask: OTHER_TASK });

		renderStartOf(TASK);

		expect(mockStartTimerWithTask).toHaveBeenCalledTimes(1);
		expect(mockStartTimer).not.toHaveBeenCalled();
	});

	it('says the timer already runs on the active task when the timer shows that run', () => {
		renderStartOf(TASK, runOf(ACTIVE_TEAM));

		expect(toast.info).toHaveBeenCalledWith('toasts.timer.ALREADY_RUNNING_ON_TASK', expect.anything());
		expect(mockRunTimerHandler).not.toHaveBeenCalled();
	});

	it('sends the active task through the main Start over a run the timer does not show, as its button does', () => {
		renderStartOf(TASK, runOf(OTHER_TEAM));

		// The timer's handler answers there that time is already tracked elsewhere
		expect(mockRunTimerHandler).toHaveBeenCalledTimes(1);
		expect(toast.info).not.toHaveBeenCalled();
	});
});

describe('a timer stop asked from the palette', () => {
	it("goes through the timer's own handler for a run the timer shows", () => {
		renderStop(runOf(ACTIVE_TEAM));

		expect(mockRunTimerHandler).toHaveBeenCalledTimes(1);
	});

	it('does nothing over a run the timer does not show, where the handler would not stop it', () => {
		renderStop(runOf(OTHER_TEAM));

		expect(mockRunTimerHandler).not.toHaveBeenCalled();
	});

	it('does nothing once no timer runs any more, where the handler would start one', () => {
		renderStop(STOPPED);

		expect(mockRunTimerHandler).not.toHaveBeenCalled();
	});
});
