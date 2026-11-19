/**
 * The sheet of the running time's start rises with the keyboard. On Android the app draws edge to edge, so the keyboard
 * no longer resizes the window: in adjustResize the sheet waited for a resize that never came and stayed under the
 * keyboard, Save included (ever-co/ever-teams#5490). In adjustPan the sheet moves itself above the keyboard.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import TimerStartSheet from './timer-start-sheet';
import { sheetLookOf } from '../../src/theme/sheet-look';
import { themeFor } from '../../src/theme/use-theme';
import { sheetPropsSeen } from '../../test/bottom-sheet-stand-in';

// The library's stand-in, whose sheet keeps the props it was given
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('../../test/bottom-sheet-stand-in').bottomSheetStandIn());
jest.mock('react-native-gesture-handler', () =>
	jest.requireActual('../../test/bottom-sheet-stand-in').gestureHandlerStandIn()
);
jest.mock('../theme', () => ({
	...jest.requireActual('../theme'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
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

		const sheet = sheetPropsSeen[sheetPropsSeen.length - 1];

		expect(sheet.android_keyboardInputMode).toBe('adjustPan');
		expect(sheet.keyboardBehavior).toBe('interactive');
	});

	it('opens on the shared sheet look, like every other sheet', async () => {
		await render(<TimerStartSheet visible onClose={jest.fn()} />);

		const sheet = sheetPropsSeen[sheetPropsSeen.length - 1];

		expect(sheet.backgroundStyle).toEqual(sheetLookOf(themeFor('light')).background);
	});
});
