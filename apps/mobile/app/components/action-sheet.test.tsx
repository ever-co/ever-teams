import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ActionSheet, { ActionSheetAction } from './action-sheet';
import { themeFor } from '../../src/theme/use-theme';
import { sheetLookOf } from '../../src/theme/sheet-look';
import { sheetPropsSeen } from '../../test/bottom-sheet-stand-in';

// The library's stand-in, whose sheet keeps the props it was given
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('../../test/bottom-sheet-stand-in').bottomSheetStandIn());
jest.mock('react-native-gesture-handler', () =>
	jest.requireActual('../../test/bottom-sheet-stand-in').gestureHandlerStandIn()
);
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 })
}));
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

function actionsWith(estimate: jest.Mock, remove: jest.Mock): ActionSheetAction[] {
	return [
		{ key: 'estimate', label: 'Estimate', onPress: estimate },
		{ key: 'remove', label: 'Remove', onPress: remove, destructive: true }
	];
}

describe('the action sheet of a card', () => {
	it('closes, then runs the action that was tapped', async () => {
		const calls: string[] = [];
		const estimate = jest.fn(() => calls.push('estimate'));
		const close = jest.fn(() => calls.push('close'));
		await render(<ActionSheet visible onClose={close} actions={actionsWith(estimate, jest.fn())} />);

		await fireEvent.press(screen.getByText('Estimate'));

		expect(calls).toEqual(['close', 'estimate']);
	});

	it('writes a destructive action in destructive-ink and the others in the foreground', async () => {
		await render(<ActionSheet visible onClose={jest.fn()} actions={actionsWith(jest.fn(), jest.fn())} />);

		const dark = themeFor('dark').colors;
		expect(StyleSheet.flatten(screen.getByText('Remove').props.style).color).toBe(dark['destructive-ink']);
		expect(StyleSheet.flatten(screen.getByText('Estimate').props.style).color).toBe(dark.foreground);
	});

	it('gives every action a touch target of 48', async () => {
		await render(<ActionSheet visible onClose={jest.fn()} actions={actionsWith(jest.fn(), jest.fn())} />);

		const row = screen.getByTestId('action-remove');
		const style = StyleSheet.flatten(row.props.style);
		expect(style.minHeight).toBe(48);
	});

	it('opens on the shared sheet look, closes on a pan down and on a tap outside', async () => {
		await render(<ActionSheet visible onClose={jest.fn()} actions={actionsWith(jest.fn(), jest.fn())} />);

		const sheet = sheetPropsSeen[sheetPropsSeen.length - 1];
		const look = sheetLookOf(themeFor('dark'));
		expect(sheet.backgroundStyle).toEqual(look.background);
		expect(sheet.enablePanDownToClose).toBe(true);
		const renderBackdrop = sheet.backdropComponent as (
			props: object
		) => React.ReactElement<{ pressBehavior: string; opacity: number }>;
		const backdrop = renderBackdrop({ animatedIndex: { value: 0 }, animatedPosition: { value: 0 } });
		expect(backdrop.props.pressBehavior).toBe('close');
		expect(backdrop.props.opacity).toBe(0.4);
	});

	it('draws nothing while closed', async () => {
		await render(<ActionSheet visible={false} onClose={jest.fn()} actions={actionsWith(jest.fn(), jest.fn())} />);

		expect(screen.queryByTestId('action-sheet')).toBeNull();
	});

	it('opens nothing without actions, where the name and the handle alone covered the screen', async () => {
		await render(<ActionSheet visible onClose={jest.fn()} actions={[]} title="Kofi Arden" />);

		expect(screen.queryByTestId('action-sheet')).toBeNull();
		expect(screen.queryByText('Kofi Arden')).toBeNull();
	});

	it('scrolls its actions, so six of them in large text stay within reach', async () => {
		await render(<ActionSheet visible onClose={jest.fn()} actions={actionsWith(jest.fn(), jest.fn())} />);

		const content = screen.getByTestId('action-sheet');

		expect(content.type).toBe('RCTScrollView');
		expect(StyleSheet.flatten(content.props.contentContainerStyle).paddingBottom).toBe(32);
	});

	it('closes when its actions go away while it is open, so it never opens again by itself', async () => {
		const close = jest.fn();
		const { rerender } = await render(
			<ActionSheet visible onClose={close} actions={actionsWith(jest.fn(), jest.fn())} />
		);
		expect(close).not.toHaveBeenCalled();

		await rerender(<ActionSheet visible onClose={close} actions={[]} />);

		expect(close).toHaveBeenCalledTimes(1);
	});
});
