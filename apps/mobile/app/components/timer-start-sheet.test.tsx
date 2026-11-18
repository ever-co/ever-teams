/**
 * The sheet of the running time's start rises with the keyboard. On Android the app draws edge to edge, so the keyboard
 * no longer resizes the window: in adjustResize the sheet waited for a resize that never came and stayed under the
 * keyboard, Save included (ever-co/ever-teams#5490). In adjustPan the sheet moves itself above the keyboard.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import TimerStartSheet from './timer-start-sheet';

// The library's stand-in, whose sheet keeps the props it was given
const mockSheetProps: Array<Record<string, unknown>> = [];
jest.mock('@gorhom/bottom-sheet', () => ({
	__esModule: true,
	...jest.requireActual<object>('@gorhom/bottom-sheet/mock'),
	default: ({ children, ...props }: { children: React.ReactNode }) => {
		mockSheetProps.push(props);
		return children;
	}
}));
jest.mock('react-native-gesture-handler', () => {
	const { View } = jest.requireActual('react-native');
	return { GestureHandlerRootView: View };
});
jest.mock('../theme', () => ({
	...jest.requireActual('../theme'),
	useAppTheme: () => ({ colors: { background: '#FFFFFF', border: '#DDD' }, dark: false })
}));
jest.mock('../services/hooks/use-timer-start-move', () => ({
	useTimerStartMove: () => ({
		access: { kind: 'edit', earlierAllowed: true, reasonRequired: false },
		runStart: Date.parse('2026-11-18T09:25:00.000Z'),
		saving: false,
		moveStart: jest.fn()
	})
}));
jest.mock('./timer-start-panel', () => () => null);

describe('The sheet of the running time', () => {
	it('asks the library to move the sheet above the keyboard on Android (adjustPan, interactive)', async () => {
		await render(<TimerStartSheet visible onClose={jest.fn()} />);

		const sheet = mockSheetProps[mockSheetProps.length - 1];

		expect(sheet.android_keyboardInputMode).toBe('adjustPan');
		expect(sheet.keyboardBehavior).toBe('interactive');
	});
});
