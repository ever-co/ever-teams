/**
 * The small menu of the running timer: "Change the start", and "Discard this run" where the organization allows it.
 * A discard is confirmed first, with the shared confirmation modal.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useTimerDiscard } from '../services/hooks/use-timer-discard';
import TimerActionsMenu from './timer-actions-menu';

jest.mock('../services/hooks/use-timer-discard', () => ({ useTimerDiscard: jest.fn() }));
jest.mock('expo-blur', () => {
	const { View } = jest.requireActual('react-native');
	return { BlurView: View };
});
jest.mock('../theme', () => ({
	...jest.requireActual('../theme'),
	useAppTheme: () => ({
		colors: {
			primary: '#282048',
			background: '#FFFFFF',
			background2: '#f7f7f8',
			tertiary: '#7E7991',
			border: '#DDD'
		},
		dark: false
	})
}));

const mockedUseTimerDiscard = useTimerDiscard as jest.Mock;

const discard = jest.fn((_timeLogId?: string) => Promise.resolve(true));

function givenDiscard({
	available = true,
	sourceKey = null as string | null,
	runningLogId = 'log-a' as string | undefined
} = {}) {
	const availability = available ? { available: true, closesAt: null } : { available: false, reason: 'DISABLED' };
	mockedUseTimerDiscard.mockReturnValue({ availability, discard, discarding: false, sourceKey, runningLogId });
	return discard;
}

async function renderMenu() {
	const onChangeStart = jest.fn();
	const tree = (callback: () => void) => (
		<PaperProvider>
			<TimerActionsMenu onChangeStart={callback} />
		</PaperProvider>
	);
	const view = await render(tree(onChangeStart));
	/**
	 * The screen reads the timer again: a new prop makes the memoized menu render with what the hook now says (the same
	 * element would not render it again, and a test of a newer run would pass whatever id the menu sends).
	 */
	const readAgain = async () => {
		const callsBefore = mockedUseTimerDiscard.mock.calls.length;
		await view.rerender(tree(() => onChangeStart()));
		expect(mockedUseTimerDiscard.mock.calls.length).toBeGreaterThan(callsBefore);
	};
	return { onChangeStart, readAgain };
}

beforeEach(() => {
	discard.mockClear();
});

async function openMenu() {
	await fireEvent.press(screen.getByTestId('timer-actions-trigger'));
}

describe('The menu of the running timer', () => {
	it('opens the panel of the start', async () => {
		givenDiscard();
		const { onChangeStart } = await renderMenu();

		await openMenu();
		await fireEvent.press(await screen.findByTestId('timer-change-start'));

		expect(onChangeStart).toHaveBeenCalled();
	});

	it('discards the run once the person confirms that nothing is saved', async () => {
		const discard = givenDiscard();
		await renderMenu();

		await openMenu();
		await fireEvent.press(await screen.findByTestId('timer-discard'));

		expect(await screen.findByText(/timer\.discard\.title/)).toBeTruthy();
		expect(screen.getByText(/timer\.discard\.description/)).toBeTruthy();
		await fireEvent.press(screen.getByText(/timer\.discard\.confirm/));

		await waitFor(() => expect(discard).toHaveBeenCalledTimes(1));
	});

	it('discards the run the confirmation was opened for, even if another one runs by then', async () => {
		givenDiscard({ runningLogId: 'log-a' });
		const { readAgain } = await renderMenu();

		await openMenu();
		await fireEvent.press(await screen.findByTestId('timer-discard'));
		// Another device stopped run A and started run B while the confirmation is open
		givenDiscard({ runningLogId: 'log-b' });
		await readAgain();
		await fireEvent.press(await screen.findByText(/timer\.discard\.confirm/));

		await waitFor(() => expect(discard).toHaveBeenCalledWith('log-a'));
	});

	it('discards nothing when the person cancels', async () => {
		const discard = givenDiscard();
		await renderMenu();

		await openMenu();
		await fireEvent.press(await screen.findByTestId('timer-discard'));
		await fireEvent.press(await screen.findByText(/settingScreen\.statusScreen\.cancelButtonText/));

		expect(discard).not.toHaveBeenCalled();
	});

	it('offers no Discard when the organization turns discarding off', async () => {
		givenDiscard({ available: false });
		await renderMenu();

		await openMenu();

		expect(await screen.findByTestId('timer-change-start')).toBeTruthy();
		expect(screen.queryByTestId('timer-discard')).toBeNull();
	});

	it('names the device a run was started from, since it stops there too', async () => {
		givenDiscard({ sourceKey: 'timer.discard.sources.web' });
		await renderMenu();

		await openMenu();
		await fireEvent.press(await screen.findByTestId('timer-discard'));

		expect(
			await screen.findByText(/timer\.discard\.descriptionElsewhere.*timer\.discard\.sources\.web/)
		).toBeTruthy();
	});
});
