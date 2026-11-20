import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import HeaderTimer from './header-timer';
import { themeFor } from '../../src/theme/use-theme';

const mockTimer = {
	canRunTimer: true,
	fomatedTimeCounter: { hours: 1, minutes: 2, seconds: 3, ms_p: 4 },
	startTimer: jest.fn(),
	stopTimer: jest.fn(),
	timerStatus: { running: true } as { running: boolean } | null
};
const mockStores = {
	TimerStore: { timeCounterState: 0, localTimerStatus: { running: true } },
	TaskStore: { activeTask: { estimate: 3600 } }
};
const mockSheetVisible: boolean[] = [];

jest.mock('../services/hooks/use-timer', () => ({ useTimer: () => mockTimer }));
jest.mock('../models', () => ({ useStores: () => mockStores }));
jest.mock('../theme', () => ({ useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light') }));
jest.mock('./timer-start-sheet', () => ({ visible }: { visible: boolean }) => {
	mockSheetVisible.push(visible);
	return null;
});
// The run button draws the web's timer marks; the test reads which one it asks for
jest.mock('../../src/components/timer-glyph', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	const markOf = (running: boolean) => {
		if (running) {
			return 'stop';
		}
		return 'play';
	};
	return { TimerGlyph: ({ running }: { running: boolean }) => createElement(Text, null, `icon ${markOf(running)}`) };
});

function runButton() {
	return screen.getByTestId('header-timer-run');
}

function setRunning(running: boolean) {
	mockStores.TimerStore.localTimerStatus.running = running;
	mockTimer.timerStatus = { running };
}

describe('the header timer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSheetVisible.length = 0;
		mockTimer.canRunTimer = true;
		setRunning(true);
	});

	it("is the web's 32-tall pill, its time in tabular digits", async () => {
		await render(<HeaderTimer />);

		const pill = StyleSheet.flatten(screen.getByTestId('header-timer').props.style);
		expect(pill.height).toBe(32);
		expect(pill.backgroundColor).toBe(themeFor('light').colors.card);
		expect(screen.getByText(/01:02:03/)).toBeTruthy();
		expect(StyleSheet.flatten(screen.getByText(/01:02:03/).props.style).fontVariant).toEqual(['tabular-nums']);
	});

	it('stops a running timer from the round destructive button at its end', async () => {
		await render(<HeaderTimer />);

		expect(screen.getByText('icon stop')).toBeTruthy();
		expect(StyleSheet.flatten(runButton().props.style).backgroundColor).toBe(themeFor('light').colors.destructive);
		expect(runButton().props.accessibilityLabel).toMatch(/timer\.stopLabel/);

		await fireEvent.press(runButton());

		expect(mockTimer.stopTimer).toHaveBeenCalledTimes(1);
		expect(mockTimer.startTimer).not.toHaveBeenCalled();
	});

	it('starts a stopped timer from the round primary button', async () => {
		setRunning(false);
		await render(<HeaderTimer />);

		expect(screen.getByText('icon play')).toBeTruthy();
		expect(StyleSheet.flatten(runButton().props.style).backgroundColor).toBe(themeFor('light').colors.primary);

		await fireEvent.press(runButton());

		expect(mockTimer.startTimer).toHaveBeenCalledTimes(1);
	});

	it('does nothing when the timer cannot run', async () => {
		mockTimer.canRunTimer = false;
		await render(<HeaderTimer />);

		await fireEvent.press(runButton());

		expect(mockTimer.stopTimer).not.toHaveBeenCalled();
		expect(mockTimer.startTimer).not.toHaveBeenCalled();
	});

	it("still opens the panel of the run's start from its time", async () => {
		await render(<HeaderTimer />);

		await fireEvent.press(screen.getByTestId('header-timer-time'));

		expect(mockSheetVisible[mockSheetVisible.length - 1]).toBe(true);
	});
});
