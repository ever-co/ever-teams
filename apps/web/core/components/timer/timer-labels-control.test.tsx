/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { activeTeamIdState, timerLabelsState, timerStatusState } from '@/core/stores';
import { timerLabelsSavedState } from '@/core/stores/timer/timer-labels';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({ useEntryLabelsSupport: () => true }));

const mockUpdateTimeLogLabels = jest.fn();
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { updateTimeLogLabels: (...args: unknown[]) => mockUpdateTimeLogLabels(...args) }
}));

// The picker has its own tests: here it says which labels it shows and picks "support"
jest.mock('@/core/components/features/entry-labels/entry-labels-picker', () => ({
	EntryLabelsPicker: ({ value, onChange }: { value: string[]; onChange: (labelIds: string[]) => void }) => (
		<button type="button" onClick={() => onChange([...value, 'support'])}>
			{`labels: ${value.join(',') || 'none'}`}
		</button>
	)
}));

import { TimerLabelsControl } from './timer-labels-control';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };

function runOfTeam(teamId: string, logId = 'run-1'): ITimerStatus {
	return {
		running: true,
		lastLog: { id: logId, organizationTeamId: teamId, tags: [meeting] }
	} as unknown as ITimerStatus;
}

function renderControl(store: ReturnType<typeof createStore>) {
	const Wrapper = ({ children }: { children?: ReactNode }) => <Provider store={store}>{children}</Provider>;
	return render(<TimerLabelsControl />, { wrapper: Wrapper });
}

describe('the labels control of the timer (#5368)', () => {
	beforeEach(() => {
		mockUpdateTimeLogLabels.mockReset();
	});

	it("edits the next start's labels while the run going belongs to another team, as the timer shows it stopped", () => {
		const store = createStore();
		store.set(activeTeamIdState, 'team-b');
		store.set(timerStatusState, runOfTeam('team-a'));
		renderControl(store);

		fireEvent.click(screen.getByRole('button', { name: 'labels: none' }));

		expect(mockUpdateTimeLogLabels).not.toHaveBeenCalled();
		expect(store.get(timerLabelsState)).toEqual(['support']);
	});

	it('saves on the running entry of the active team, and remembers when that save landed', async () => {
		const store = createStore();
		store.set(activeTeamIdState, 'team-a');
		store.set(timerStatusState, runOfTeam('team-a'));
		mockUpdateTimeLogLabels.mockResolvedValue({ id: 'run-1', tags: [meeting, { id: 'support' }] });
		renderControl(store);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'labels: meeting' }));
		});

		expect(mockUpdateTimeLogLabels).toHaveBeenCalledWith('run-1', ['meeting', 'support']);
		expect(store.get(timerLabelsSavedState)).toMatchObject({ logId: 'run-1', tags: [meeting, { id: 'support' }] });
	});

	it('keeps the record of the newer run when the save of an earlier run lands after it', async () => {
		const store = createStore();
		store.set(activeTeamIdState, 'team-a');
		store.set(timerStatusState, runOfTeam('team-a', 'run-1'));
		let landEarlierSave: (log: unknown) => void = () => undefined;
		mockUpdateTimeLogLabels
			.mockImplementationOnce(() => new Promise((resolve) => (landEarlierSave = resolve)))
			.mockResolvedValueOnce({ id: 'run-2', tags: [meeting, { id: 'support' }] });
		renderControl(store);

		// A change on run 1, whose save is slow; run 1 stops and run 2 starts meanwhile, and a change is saved on it
		fireEvent.click(screen.getByRole('button', { name: 'labels: meeting' }));
		act(() => store.set(timerStatusState, runOfTeam('team-a', 'run-2')));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'labels: meeting' }));
		});
		await act(async () => {
			landEarlierSave({ id: 'run-1', tags: [meeting, { id: 'support' }] });
		});

		expect(mockUpdateTimeLogLabels).toHaveBeenNthCalledWith(1, 'run-1', ['meeting', 'support']);
		expect(mockUpdateTimeLogLabels).toHaveBeenNthCalledWith(2, 'run-2', ['meeting', 'support']);
		expect(store.get(timerLabelsSavedState)).toMatchObject({ logId: 'run-2' });
	});
});
