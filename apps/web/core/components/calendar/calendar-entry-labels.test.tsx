/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const mockToastError = jest.fn();
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({ useEntryLabelsSupport: () => true }));

const mockUpdateTimeLogLabels = jest.fn();
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { updateTimeLogLabels: (...args: unknown[]) => mockUpdateTimeLogLabels(...args) }
}));

// The picker has its own tests: here it says which labels it shows and adds "support"
jest.mock('@/core/components/features/entry-labels/entry-labels-picker', () => ({
	EntryLabelsPicker: ({ value, onChange }: { value: string[]; onChange: (labelIds: string[]) => void }) => (
		<button type="button" onClick={() => onChange([...value, 'support'])}>
			{`labels: ${value.join(',') || 'none'}`}
		</button>
	)
}));

import { EntryLabelsLine } from './calendar-entry-labels';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };
const support = { id: 'support', name: 'support', color: '#16a34a' };
const design = { id: 'design', name: 'design', color: '#9333ea' };

function entryWith(tags: Array<typeof meeting>) {
	return { id: 'log-1', tags } as unknown as ITimeLog;
}

/** The card of an entry, in a Calendar whose refetch brings nothing new: the read of the entry stays as it was. */
function renderCard(log: ITimeLog) {
	const queryClient = new QueryClient();
	const Wrapper = ({ children }: { children?: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const view = render(<EntryLabelsLine log={log} canEdit />, { wrapper: Wrapper });
	return { ...view, showEntry: (next: ITimeLog) => view.rerender(<EntryLabelsLine log={next} canEdit />) };
}

describe('the labels of an entry on its Calendar card (#5368)', () => {
	beforeEach(() => {
		mockUpdateTimeLogLabels.mockReset();
		mockToastError.mockReset();
	});

	it('keeps the labels it saved while the entry has not been read again, as when the refetch fails', async () => {
		mockUpdateTimeLogLabels.mockResolvedValue(entryWith([meeting, support]));
		renderCard(entryWith([meeting]));

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'labels: meeting' }));
		});

		expect(mockUpdateTimeLogLabels).toHaveBeenCalledWith('log-1', ['meeting', 'support']);
		expect(screen.getByRole('button', { name: 'labels: meeting,support' })).toBeTruthy();
	});

	it("takes the entry's labels again once it is read with other labels than before the save", async () => {
		mockUpdateTimeLogLabels.mockResolvedValue(entryWith([meeting, support]));
		const card = renderCard(entryWith([meeting]));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'labels: meeting' }));
		});

		card.showEntry(entryWith([meeting, support]));
		expect(screen.getByRole('button', { name: 'labels: meeting,support' })).toBeTruthy();

		// Changed elsewhere afterwards
		card.showEntry(entryWith([design]));
		expect(screen.getByRole('button', { name: 'labels: design' })).toBeTruthy();
	});

	it('puts back the labels it showed when the save fails', async () => {
		mockUpdateTimeLogLabels.mockRejectedValue(new Error('Network Error'));
		renderCard(entryWith([meeting]));

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'labels: meeting' }));
		});

		expect(screen.getByRole('button', { name: 'labels: meeting' })).toBeTruthy();
		expect(mockToastError).toHaveBeenCalledWith('timer.labels.SAVE_FAILED');
	});
});
