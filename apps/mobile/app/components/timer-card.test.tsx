/**
 * Where the phone offers the start and the discard of the running timer: tapping the running time, on the timer card
 * or in the header timer, opens the panel of its start, and the timer card holds the small menu. Nothing of it shows
 * when no timer runs.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useTimer } from '../services/hooks/use-timer';
import TimerCard from './timer-card';
import HeaderTimer from './header-timer';

// The library's own stand-in, marked as an ES module so its `default` is the sheet
jest.mock('@gorhom/bottom-sheet', () => ({
	__esModule: true,
	...jest.requireActual<object>('@gorhom/bottom-sheet/mock')
}));
jest.mock('react-native-gesture-handler', () => {
	const { View } = jest.requireActual('react-native');
	return { GestureHandlerRootView: View };
});
jest.mock('expo-blur', () => {
	const { View } = jest.requireActual('react-native');
	return { BlurView: View };
});
jest.mock('../models', () => ({
	useStores: () => ({
		TaskStore: { activeTask: { id: 'task-1', estimate: 0 } },
		TimerStore: { timeCounterState: 0, localTimerStatus: { running: true } }
	})
}));
jest.mock('../services/hooks/use-timer', () => ({ useTimer: jest.fn() }));
jest.mock('../services/hooks/features/use-task-statistics', () => ({
	useTaskStatistics: () => ({ activeTaskTotalStat: null })
}));
jest.mock('./timer-button', () => () => null);
jest.mock('../services/hooks/use-timer-start-move', () => ({
	useTimerStartMove: () => ({
		access: { kind: 'edit', earlierAllowed: true, reasonRequired: false },
		runStart: Date.parse('2026-11-16T09:25:00.000Z'),
		saving: false,
		moveStart: jest.fn()
	})
}));
jest.mock('../services/hooks/use-timer-discard', () => ({
	useTimerDiscard: () => ({
		availability: { available: true, closesAt: null },
		discard: jest.fn(),
		discarding: false,
		sourceKey: null
	})
}));
jest.mock('../theme', () => ({
	...jest.requireActual('../theme'),
	useAppTheme: () => ({
		colors: { primary: '#282048', background: '#FFFFFF', tertiary: '#7E7991', border: '#DDD' },
		dark: false
	})
}));

const mockedUseTimer = useTimer as jest.Mock;

function givenTimer(running: boolean) {
	mockedUseTimer.mockReturnValue({
		fomatedTimeCounter: { hours: 0, minutes: 5, seconds: 0, ms_p: 0 },
		timerStatus: { running, duration: 0 },
		canRunTimer: true,
		startTimer: jest.fn(),
		stopTimer: jest.fn()
	});
}

async function renderWithPaper(element: React.ReactElement) {
	return render(<PaperProvider>{element}</PaperProvider>);
}

describe('The timer card', () => {
	it('opens the panel of the start when the running time is tapped, and holds the menu', async () => {
		givenTimer(true);
		await renderWithPaper(<TimerCard />);

		expect(screen.queryByTestId('timer-start-panel')).toBeNull();
		expect(screen.getByTestId('timer-actions-trigger')).toBeTruthy();

		await fireEvent.press(screen.getByTestId('timer-card-time'));

		expect(await screen.findByTestId('timer-start-panel')).toBeTruthy();
	});

	it('offers neither the panel nor the menu when no timer runs', async () => {
		givenTimer(false);
		await renderWithPaper(<TimerCard />);

		expect(screen.queryByTestId('timer-actions-trigger')).toBeNull();
		await fireEvent.press(screen.getByTestId('timer-card-time'));

		expect(screen.queryByTestId('timer-start-panel')).toBeNull();
	});
});

describe('The header timer', () => {
	it('opens the panel of the start when the running time is tapped', async () => {
		givenTimer(true);
		await renderWithPaper(<HeaderTimer />);

		await fireEvent.press(screen.getByTestId('header-timer-time'));

		expect(await screen.findByTestId('timer-start-panel')).toBeTruthy();
	});
});
