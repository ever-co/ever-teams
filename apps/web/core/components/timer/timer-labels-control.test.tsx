/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { activeTeamIdState, timerLabelsState, timerStatusState } from '@/core/stores';
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

function runOfTeam(teamId: string): ITimerStatus {
	return {
		running: true,
		lastLog: { id: 'run-1', organizationTeamId: teamId, tags: [meeting] }
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
});
