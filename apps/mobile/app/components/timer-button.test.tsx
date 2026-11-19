import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TimerButton from './timer-button';
import { themeFor } from '../../src/theme/use-theme';

const mockTimer = { canRunTimer: true, startTimer: jest.fn(), stopTimer: jest.fn() };
const mockStores = { TimerStore: { localTimerStatus: { running: false } } };

jest.mock('../services/hooks/use-timer', () => ({ useTimer: () => mockTimer }));
jest.mock('../models', () => ({ useStores: () => mockStores }));
jest.mock('../theme', () => ({
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));
jest.mock('@expo/vector-icons', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return { Ionicons: ({ name }: { name: string }) => createElement(Text, null, name) };
});

const light = themeFor('light');

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe("Work's start and stop", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockTimer.canRunTimer = true;
		mockStores.TimerStore.localTimerStatus.running = false;
	});

	it('starts from a round 48 primary button with the glow', async () => {
		await render(<TimerButton />);

		expect(styleOf('timer-start').width).toBe(48);
		expect(styleOf('timer-start').backgroundColor).toBe(light.colors.primary);
		expect(styleOf('timer-start').boxShadow).toBeTruthy();

		await fireEvent.press(screen.getByTestId('timer-start'));

		expect(mockTimer.startTimer).toHaveBeenCalledTimes(1);
	});

	it('stops from the destructive one while the timer runs', async () => {
		mockStores.TimerStore.localTimerStatus.running = true;
		await render(<TimerButton />);

		expect(styleOf('timer-stop').backgroundColor).toBe(light.colors.destructive);

		await fireEvent.press(screen.getByTestId('timer-stop'));

		expect(mockTimer.stopTimer).toHaveBeenCalledTimes(1);
	});

	it('keeps Start out of reach while the timer cannot run', async () => {
		mockTimer.canRunTimer = false;
		await render(<TimerButton />);

		await fireEvent.press(screen.getByTestId('timer-start'));

		expect(mockTimer.startTimer).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start').props.accessibilityState).toEqual({ disabled: true });
	});
});
