import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { RunButton } from './run-button';
import { themeFor } from '../theme/use-theme';

jest.mock('@expo/vector-icons', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return {
		Ionicons: ({ name, size }: { name: string; size: number }) => createElement(Text, null, `${name} ${size}`)
	};
});

const light = themeFor('light');

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe('the round run button', () => {
	it('starts in primary with a play mark, half its size', async () => {
		await render(
			<RunButton
				theme={light}
				running={false}
				size={48}
				onPress={jest.fn()}
				testID="run"
				accessibilityLabel="Start"
			/>
		);

		expect(styleOf('run').backgroundColor).toBe(light.colors.primary);
		expect(styleOf('run').width).toBe(48);
		expect(styleOf('run').borderRadius).toBe(24);
		expect(screen.getByText('play 24')).toBeTruthy();
	});

	it('stops in destructive with a stop mark', async () => {
		await render(
			<RunButton theme={light} running size={24} onPress={jest.fn()} testID="run" accessibilityLabel="Stop" />
		);

		expect(styleOf('run').backgroundColor).toBe(light.colors.destructive);
		expect(screen.getByText('stop 12')).toBeTruthy();
		expect(screen.getByLabelText('Stop')).toBeTruthy();
	});

	it("carries the web's glow tinted with its own color only when asked", async () => {
		await render(
			<RunButton
				theme={light}
				running={false}
				size={48}
				glow
				onPress={jest.fn()}
				testID="run"
				accessibilityLabel="Start"
			/>
		);
		expect(styleOf('run').boxShadow).toMatch(/^0 6px 16px -6px hsla?\(239/);

		await render(
			<RunButton
				theme={light}
				running={false}
				size={24}
				onPress={jest.fn()}
				testID="quiet"
				accessibilityLabel="Start"
			/>
		);
		expect(styleOf('quiet').boxShadow).toBeUndefined();
	});

	it('does nothing while disabled, and says so', async () => {
		const onPress = jest.fn();
		await render(
			<RunButton
				theme={light}
				running={false}
				size={48}
				disabled
				onPress={onPress}
				testID="run"
				accessibilityLabel="Start"
			/>
		);

		await fireEvent.press(screen.getByTestId('run'));

		expect(onPress).not.toHaveBeenCalled();
		expect(screen.getByTestId('run').props.accessibilityState).toEqual({ disabled: true });
	});
});
