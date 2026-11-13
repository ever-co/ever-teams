/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockRescheduleMeeting = jest.fn();
const mockGetScheduledMeetings = jest.fn();

jest.mock('@/core/services/client/api/meetings', () => ({
	scheduledMeetingService: {
		getScheduledMeetings: (...args: unknown[]) => mockGetScheduledMeetings(...args),
		rescheduleMeeting: (...args: unknown[]) => mockRescheduleMeeting(...args)
	}
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { name: 'Ruslan Konviser', employee: { id: 'employee-1' } } })
}));

import { useScheduledMeetings } from './use-scheduled-meetings';

function renderScheduledMeetings() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useScheduledMeetings(), { wrapper });
}

describe('useScheduledMeetings', () => {
	beforeEach(() => {
		mockGetScheduledMeetings.mockReset().mockResolvedValue([]);
		mockRescheduleMeeting.mockReset().mockResolvedValue(undefined);
	});

	it('reschedules an appointment with its new title, time and link, then reads the agenda again', async () => {
		const { result } = renderScheduledMeetings();
		await waitFor(() => expect(mockGetScheduledMeetings).toHaveBeenCalledTimes(1));
		const link = 'https://app.example.com/meet/jitsi?room=abc&title=Demo';

		await act(async () => {
			await result.current.rescheduleMeeting('appointment-1', {
				title: 'Demo',
				start: new Date('2026-11-13T09:30:00.000Z'),
				durationMinutes: 45,
				link
			});
		});

		expect(mockRescheduleMeeting).toHaveBeenCalledWith('appointment-1', {
			agenda: 'Demo',
			startDateTime: '2026-11-13T09:30:00.000Z',
			endDateTime: '2026-11-13T10:15:00.000Z',
			location: link
		});
		await waitFor(() => expect(mockGetScheduledMeetings).toHaveBeenCalledTimes(2));
		expect(result.current.hostName).toBe('Ruslan Konviser');
	});
});
