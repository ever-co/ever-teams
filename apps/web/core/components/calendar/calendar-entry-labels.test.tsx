/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { CALENDAR_LOGS_KEY_PART } from '@/core/hooks/calendar/use-calendar-logs';
import { queryKeys } from '@/core/query/keys';
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

/** The Calendar's read of the entry, answered in turn by each answer queued with `mockResolvedValueOnce`. */
const mockReadEntry = jest.fn();

/** The Calendar's read of the entries, under the key it has in `useCalendarLogs`. */
const CALENDAR_READ_KEY = [
	...queryKeys.timesheet.logs('tenant-1', 'organization-1', '2026-11-16', '2026-11-22', ['employee-1']),
	CALENDAR_LOGS_KEY_PART,
	{ timeZone: 'UTC' }
];

function CalendarCard() {
	const { data } = useQuery({
		queryKey: CALENDAR_READ_KEY,
		queryFn: async () => ({ request: {}, logs: [await mockReadEntry()] })
	});
	const log = data?.logs[0];
	if (!log) {
		return null;
	}
	return <EntryLabelsLine log={log} canEdit />;
}

/** The card of an entry the Calendar read with these labels. */
async function renderCard(tags: Array<typeof meeting>) {
	mockReadEntry.mockResolvedValueOnce(entryWith(tags));
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const Wrapper = ({ children }: { children?: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	render(<CalendarCard />, { wrapper: Wrapper });
	await screen.findByRole('button', { name: `labels: ${tags.map((tag) => tag.id).join(',')}` });
	const readEntriesAgain = async () => {
		await act(async () => {
			await queryClient.refetchQueries({ queryKey: queryKeys.timesheet.all });
		});
	};
	/** A read of another list of the `timesheet` family, as a report or an overlap lookup makes. */
	const readAReport = async () => {
		await act(async () => {
			await queryClient.fetchQuery({ queryKey: queryKeys.timesheet.reports.all, queryFn: async () => [] });
		});
	};
	return { readEntriesAgain, readAReport };
}

async function addSupport(shown: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: `labels: ${shown}` }));
	});
}

describe('the labels of an entry on its Calendar card (#5368)', () => {
	beforeEach(() => {
		mockUpdateTimeLogLabels.mockReset().mockResolvedValue(entryWith([meeting, support]));
		mockReadEntry.mockReset();
		mockToastError.mockReset();
	});

	it('follows the entry read again after the save', async () => {
		await renderCard([meeting]);
		mockReadEntry.mockResolvedValueOnce(entryWith([meeting, support]));

		await addSupport('meeting');

		expect(mockUpdateTimeLogLabels).toHaveBeenCalledWith('log-1', ['meeting', 'support']);
		await screen.findByRole('button', { name: 'labels: meeting,support' });
	});

	it('keeps the labels it saved when the entries cannot be read again after the save', async () => {
		await renderCard([meeting]);
		mockReadEntry.mockRejectedValueOnce(new Error('Network Error'));

		await addSupport('meeting');

		expect(screen.getByRole('button', { name: 'labels: meeting,support' })).toBeTruthy();
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('takes the next read of the entries, even when it shows the labels from before the save', async () => {
		const card = await renderCard([meeting]);
		mockReadEntry.mockRejectedValueOnce(new Error('Network Error'));
		await addSupport('meeting');

		// Someone else removed "support" meanwhile: the next read that succeeds shows "meeting" again
		mockReadEntry.mockResolvedValueOnce(entryWith([meeting]));
		await card.readEntriesAgain();

		await waitFor(() => expect(screen.getByRole('button', { name: 'labels: meeting' })).toBeTruthy());
	});

	it("waits for the Calendar's read of the entry, not for a read of another timesheet list", async () => {
		const card = await renderCard([meeting]);
		mockReadEntry.mockRejectedValueOnce(new Error('Network Error'));
		await addSupport('meeting');

		// A report read meanwhile says nothing of this entry: the saved labels stay
		await card.readAReport();
		expect(screen.getByRole('button', { name: 'labels: meeting,support' })).toBeTruthy();

		// The Calendar reads the entry again, with the labels from before the save: the card follows it
		mockReadEntry.mockResolvedValueOnce(entryWith([meeting]));
		await card.readEntriesAgain();
		await waitFor(() => expect(screen.getByRole('button', { name: 'labels: meeting' })).toBeTruthy());
	});

	it('follows a later change made elsewhere', async () => {
		const card = await renderCard([meeting]);
		mockReadEntry.mockResolvedValueOnce(entryWith([meeting, support]));
		await addSupport('meeting');

		mockReadEntry.mockResolvedValueOnce(entryWith([design]));
		await card.readEntriesAgain();

		await screen.findByRole('button', { name: 'labels: design' });
	});

	it('puts back the labels it showed when the save fails', async () => {
		mockUpdateTimeLogLabels.mockReset().mockRejectedValue(new Error('Network Error'));
		await renderCard([meeting]);

		await addSupport('meeting');

		expect(screen.getByRole('button', { name: 'labels: meeting' })).toBeTruthy();
		expect(mockToastError).toHaveBeenCalledWith('timer.labels.SAVE_FAILED');
	});
});
