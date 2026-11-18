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
// The fields are the sheet's own inputs: the library's stand-in, marked as an ES module
jest.mock('@gorhom/bottom-sheet', () => ({
	__esModule: true,
	...jest.requireActual<object>('@gorhom/bottom-sheet/mock')
}));
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
	onSave = jest.fn(() => Promise.resolve()),
	runStart: firstRunStart = RUN_START
}: {
	access?: TimerStartMoveAccess;
	saving?: boolean;
	onSave?: jest.Mock;
	runStart?: number;
} = {}) {
	const onClose = jest.fn();
	const panelAt = (runStart: number) => (
		<TimerStartPanel access={access} runStart={runStart} saving={saving} onSave={onSave} onClose={onClose} />
	);
	const view = await render(panelAt(firstRunStart));
	/** A status read brings a start moved elsewhere while the panel is open. */
	const startMovedElsewhere = async (runStart: number) => {
		await view.rerender(panelAt(runStart));
	};
	return { onSave, onClose, startMovedElsewhere };
}

async function typeStart(time: string) {
	await fireEvent.changeText(screen.getByTestId('timer-start-time'), time);
	await fireEvent.press(screen.getByTestId('timer-start-save'));
}

beforeEach(() => {
	jest.setSystemTime(NOW);
	(showMessage as jest.Mock).mockClear();
});

describe('The panel of the running time, while its start moves elsewhere', () => {
	it('shows the new start in the untouched field, so Save never writes the old one back', async () => {
		const { onSave, startMovedElsewhere } = await renderPanel();

		// The start moved to 9:00 on the web while the sheet is open
		await startMovedElsewhere(new Date(2026, 10, 16, 9, 0).getTime());

		expect(screen.getByTestId('timer-start-time').props.value).toBe('09:00');
		await fireEvent.press(screen.getByTestId('timer-start-save'));
		expect(onSave).not.toHaveBeenCalled();
	});

	it('says the start changed elsewhere when the person had typed a time, and keeps the new start', async () => {
		const { onSave, startMovedElsewhere } = await renderPanel();
		await fireEvent.changeText(screen.getByTestId('timer-start-time'), '09:10');

		await startMovedElsewhere(new Date(2026, 10, 16, 9, 0).getTime());

		expect(screen.getByTestId('timer-start-time').props.value).toBe('09:00');
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.changed');
		expect(onSave).not.toHaveBeenCalled();
	});
});

describe('The panel of a run that started before midnight', () => {
	// Started at 23:50 on the 15th, now 00:20 on the 16th: a typed time could mean either day
	const BEFORE_MIDNIGHT = new Date(2026, 10, 15, 23, 50).getTime();

	beforeEach(() => {
		jest.setSystemTime(new Date(2026, 10, 16, 0, 20).getTime());
	});

	it('asks which day the new start is on before anything is sent', async () => {
		const { onSave } = await renderPanel({ runStart: BEFORE_MIDNIGHT });

		await typeStart('12:00');

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.chooseDay');
	});

	it('refuses 12:00 on the day after as a start in the future', async () => {
		const { onSave } = await renderPanel({ runStart: BEFORE_MIDNIGHT });

		await fireEvent.press(screen.getByTestId('timer-start-day-1'));
		await typeStart('12:00');

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByTestId('timer-start-error').props.children).toContain('timer.startMove.inFuture');
	});

	it('moves the start to 12:00 on the day the run started, once that day is chosen', async () => {
		const { onSave } = await renderPanel({ runStart: BEFORE_MIDNIGHT });

		await fireEvent.press(screen.getByTestId('timer-start-day-0'));
		await typeStart('12:00');

		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith({ startedAt: new Date(2026, 10, 15, 12, 0), reason: '' })
		);
	});
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
		const { onSave } = await renderPanel({
			access: { kind: 'edit', earlierAllowed: false, reasonRequired: false }
		});

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
