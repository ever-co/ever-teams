/**
 * The panel of the running time: "Started at 9:25", a time field and Save, by the rules of the web's panel
 * (ever-co/ever-teams#5266), or the start alone with a line saying why it cannot change here.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { TimerStartMoveAccess } from '../helpers/timer-start-move';
import { TimerStartPanel } from './timer-start-panel';

jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('../theme', () => ({
	...jest.requireActual('../theme'),
	useAppTheme: () => ({
		colors: { primary: '#282048', background: '#FFFFFF', tertiary: '#7E7991', border: '#DDD' },
		dark: false
	})
}));

/** 9:25 and 9:30 on 16 November 2026, in the phone's own time zone. */
const RUN_START = new Date(2026, 10, 16, 9, 25).getTime();
const NOW = new Date(2026, 10, 16, 9, 30).getTime();
const EDIT: TimerStartMoveAccess = { kind: 'edit', earlierAllowed: true, reasonRequired: false };

async function renderPanel({
	access = EDIT,
	saving = false,
	onSave = jest.fn(() => Promise.resolve())
}: {
	access?: TimerStartMoveAccess;
	saving?: boolean;
	onSave?: jest.Mock;
} = {}) {
	const onClose = jest.fn();
	await render(<TimerStartPanel access={access} runStart={RUN_START} saving={saving} onSave={onSave} onClose={onClose} />);
	return { onSave, onClose };
}

async function typeStart(time: string) {
	await fireEvent.changeText(screen.getByTestId('timer-start-time'), time);
	await fireEvent.press(screen.getByTestId('timer-start-save'));
}

beforeEach(() => {
	jest.setSystemTime(NOW);
	(showMessage as jest.Mock).mockClear();
});

describe('The panel of the running time', () => {
	it('shows when the run started, and moves the start to the time typed', async () => {
		const { onSave, onClose } = await renderPanel();

		expect(screen.getByText(/timer\.startMove\.startedAt.*09:25/)).toBeTruthy();
		expect(screen.getByTestId('timer-start-time').props.value).toBe('09:25');

		await typeStart('09:00');

		await waitFor(() => expect(onClose).toHaveBeenCalled());
		expect(onSave).toHaveBeenCalledWith({ startedAt: new Date(2026, 10, 16, 9, 0), reason: '' });
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('timer.startMove.saved'), type: 'success' })
		);
	});

	it('closes without asking the API when the start stays the same minute', async () => {
		const { onSave, onClose } = await renderPanel();

		await typeStart('09:25');

		expect(onSave).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('asks for a time when the field holds none', async () => {
		const { onSave } = await renderPanel();

		await typeStart('9h');

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.invalidTime');
	});

	it('refuses a start in the future before asking the API', async () => {
		const { onSave } = await renderPanel();

		await typeStart('09:45');

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.inFuture');
	});

	it('offers only a later start where time may not be added by hand', async () => {
		const { onSave } = await renderPanel({ access: { kind: 'edit', earlierAllowed: false, reasonRequired: false } });

		expect(screen.getByText(/timer\.startMove\.laterOnly/)).toBeTruthy();
		await typeStart('09:00');

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.manualNotAllowed');

		await typeStart('09:28');

		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
	});

	it('asks for the reason the organization requires, and sends it', async () => {
		const { onSave } = await renderPanel({ access: { kind: 'edit', earlierAllowed: true, reasonRequired: true } });

		await typeStart('09:00');
		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.reasonRequired');

		await fireEvent.changeText(screen.getByTestId('timer-start-reason'), 'Came in at 9');
		await fireEvent.press(screen.getByTestId('timer-start-save'));

		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith({ startedAt: new Date(2026, 10, 16, 9, 0), reason: 'Came in at 9' })
		);
	});

	it('says why the API refused the move, and keeps the panel open', async () => {
		const onSave = jest.fn(() => Promise.reject({ status: 409, code: 'TIMER_START_OVERLAP' }));
		const { onClose } = await renderPanel({ onSave });

		await typeStart('09:00');

		await waitFor(() =>
			expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.overlap')
		);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('says the phone is offline when the move never reached the API', async () => {
		const onSave = jest.fn(() => Promise.reject({ status: null }));
		await renderPanel({ onSave });

		await typeStart('09:00');

		await waitFor(() =>
			expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.offline')
		);
	});

	it('shows the save under way, and takes no second press', async () => {
		const { onSave } = await renderPanel({ saving: true });

		expect(screen.getByText(/timer\.startMove\.saving/)).toBeTruthy();
		await fireEvent.press(screen.getByTestId('timer-start-save'));

		expect(onSave).not.toHaveBeenCalled();
	});

	it('shows the start alone, with the reason, for a run of the desktop app', async () => {
		await renderPanel({ access: { kind: 'view', why: 'tracker' } });

		expect(screen.getByText(/timer\.startMove\.startedAt.*09:25/)).toBeTruthy();
		expect(screen.getByText(/timer\.startMove\.viewTracker/)).toBeTruthy();
		expect(screen.queryByTestId('timer-start-time')).toBeNull();
		expect(screen.queryByTestId('timer-start-save')).toBeNull();
	});

	it('shows the start alone where members may not change tracked time', async () => {
		await renderPanel({ access: { kind: 'view', why: 'not-allowed' } });

		expect(screen.getByText(/timer\.startMove\.viewNotAllowed/)).toBeTruthy();
		expect(screen.queryByTestId('timer-start-time')).toBeNull();
	});

	it('shows the start alone against an API without the move', async () => {
		await renderPanel({ access: { kind: 'view', why: 'unsupported' } });

		expect(screen.getByText(/timer\.startMove\.unsupported/)).toBeTruthy();
		expect(screen.queryByTestId('timer-start-time')).toBeNull();
	});
});
