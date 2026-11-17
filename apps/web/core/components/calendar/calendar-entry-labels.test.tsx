/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
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

import { CalendarEntriesRead, EntryLabelsLine } from './calendar-entry-labels';

const meeting = { id: 'meeting', name: 'meeting', color: '#2563eb' };
const support = { id: 'support', name: 'support', color: '#16a34a' };
const design = { id: 'design', name: 'design', color: '#9333ea' };

function entryWith(tags: Array<typeof meeting>) {
	return { id: 'log-1', tags } as unknown as ITimeLog;
}

/** The Calendar's read of the entry, answered in turn by each answer queued with `mockResolvedValueOnce`. */
const mockReadEntry = jest.fn();

/** The key of a read of one member's entries, as `useCalendarLogs` makes it for the Calendar and the Work diary. */
function entriesKeyOf(startDate: string, endDate: string) {
	return [
		...queryKeys.timesheet.logs('tenant-1', 'organization-1', startDate, endDate, ['employee-1']),
		'calendar',
		{ timeZone: 'UTC' }
	];
}

/** The Calendar page: its read of the entries, and the card of the one entry it shows while that card is open. */
function CalendarCard({ isOpen = true }: Readonly<{ isOpen?: boolean }>) {
	const { data, dataUpdatedAt } = useQuery({
		queryKey: entriesKeyOf('2026-11-16', '2026-11-22'),
		queryFn: async () => ({ request: {}, logs: [await mockReadEntry()] })
	});
	const log = data?.logs[0];
	if (!log) {
		return null;
	}
	return (
		<CalendarEntriesRead readAt={dataUpdatedAt}>
			{isOpen && <EntryLabelsLine log={log} canEdit />}
		</CalendarEntriesRead>
	);
}

/** The card of an entry the Calendar read with these labels. */
async function renderCard(tags: Array<typeof meeting>) {
	mockReadEntry.mockResolvedValueOnce(entryWith(tags));
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const Wrapper = ({ children }: { children?: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const view = render(<CalendarCard />, { wrapper: Wrapper });
	await screen.findByRole('button', { name: `labels: ${tags.map((tag) => tag.id).join(',')}` });
	const readEntriesAgain = async () => {
		await act(async () => {
			await queryClient.refetchQueries({ queryKey: queryKeys.timesheet.all });
		});
	};
	/** A read of the same entry by another page (the Work diary's own days), or of another list of the family. */
	const readElsewhere = async () => {
		await act(async () => {
			await queryClient.fetchQuery({
				queryKey: entriesKeyOf('2026-11-01', '2026-11-30'),
				queryFn: async () => ({ request: {}, logs: [entryWith([meeting])] })
			});
			await queryClient.fetchQuery({ queryKey: queryKeys.timesheet.reports.all, queryFn: async () => [] });
		});
	};
	const closeCard = () => view.rerender(<CalendarCard isOpen={false} />);
	const openCard = () => view.rerender(<CalendarCard isOpen />);
	return { readEntriesAgain, readElsewhere, closeCard, openCard };
}

async function addSupport(shown: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: `labels: ${shown}` }));
	});
}

describe('the labels of an entry on its Calendar card (#5368)', () => {
	beforeEach(() => {
		// Each read of the entries at its own time, however fast the test runs
		let clock = Date.parse('2026-11-16T10:00:00.000Z');
		jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1));
		mockUpdateTimeLogLabels.mockReset().mockResolvedValue(entryWith([meeting, support]));
		mockReadEntry.mockReset();
		mockToastError.mockReset();
	});

	afterEach(() => {
		jest.restoreAllMocks();
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

	it("waits for the Calendar's own read, not for another page's read of the entry or of another list", async () => {
		const card = await renderCard([meeting]);
		mockReadEntry.mockRejectedValueOnce(new Error('Network Error'));
		await addSupport('meeting');

		// The Work diary's read of its days holds the entry as it was, and a report is read: the saved labels stay
		await card.readElsewhere();
		expect(screen.getByRole('button', { name: 'labels: meeting,support' })).toBeTruthy();

		// The Calendar reads the entry again, with the labels from before the save: the card follows it
		mockReadEntry.mockResolvedValueOnce(entryWith([meeting]));
		await card.readEntriesAgain();
		await waitFor(() => expect(screen.getByRole('button', { name: 'labels: meeting' })).toBeTruthy());
	});

	it('keeps the labels it saved when the card is closed and opened again before the Calendar reads the entries', async () => {
		const card = await renderCard([meeting]);
		mockReadEntry.mockRejectedValueOnce(new Error('Network Error'));
		await addSupport('meeting');

		card.closeCard();
		card.openCard();
		expect(screen.getByRole('button', { name: 'labels: meeting,support' })).toBeTruthy();

		// The Calendar then reads the entries: the card opened again follows that read
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
