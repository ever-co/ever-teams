/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetInvitedMeetings = jest.fn();

jest.mock('@/core/services/client/api/meetings', () => ({
	scheduledMeetingService: {
		getInvitedMeetings: (...args: unknown[]) => mockGetInvitedMeetings(...args)
	}
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { employee: { id: 'employee-1' } } })
}));

import { INVITED_MEETINGS_REFRESH_MS, useInvitedMeetings } from './use-invited-meetings';

const invitation = {
	id: 'appointment-9',
	agenda: 'Planning',
	location: 'https://app.ever.team/meet/jitsi?room=abc',
	startDateTime: '2030-11-12T15:00:00.000Z',
	endDateTime: '2030-11-12T15:30:00.000Z',
	host: { employeeId: 'employee-2', name: 'Ana Silva' }
};

/** An API error as the client's service raises it: its HTTP status on `statusCode`. */
const apiError = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });

function renderInvitedMeetings() {
	// The app's own retry delays, shortened: what is under test is whether a failure is asked again, not how late
	const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 1 } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useInvitedMeetings(), { wrapper });
}

describe('useInvitedMeetings (#5022)', () => {
	beforeEach(() => mockGetInvitedMeetings.mockReset());
	afterEach(() => jest.useRealTimers());

	it('reads the invitations again every minute while the agenda is open, so a moved or new meeting shows', async () => {
		jest.useFakeTimers({ advanceTimers: true });
		mockGetInvitedMeetings.mockResolvedValueOnce([]).mockResolvedValue([invitation]);
		const { result } = renderInvitedMeetings();
		await waitFor(() => expect(mockGetInvitedMeetings).toHaveBeenCalledTimes(1));
		expect(result.current.meetings).toEqual([]);

		await act(async () => {
			jest.advanceTimersByTime(INVITED_MEETINGS_REFRESH_MS);
		});

		await waitFor(() => expect(mockGetInvitedMeetings).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(result.current.meetings.map((meeting) => meeting.title)).toEqual(['Planning']));
		expect(result.current.meetings[0]).toEqual(expect.objectContaining({ isInvited: true, hostName: 'Ana Silva' }));
	});

	it('says nothing failed on a platform without the route, and asks it once', async () => {
		mockGetInvitedMeetings.mockRejectedValue(apiError(404));
		const { result } = renderInvitedMeetings();

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.isError).toBe(false);
		expect(result.current.meetings).toEqual([]);
		expect(mockGetInvitedMeetings).toHaveBeenCalledTimes(1);
	});

	it('says so when the invitations fail to load for another reason, after asking again, and loads them on retry', async () => {
		mockGetInvitedMeetings.mockRejectedValue(apiError(500));
		const { result } = renderInvitedMeetings();

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockGetInvitedMeetings).toHaveBeenCalledTimes(3);

		mockGetInvitedMeetings.mockResolvedValue([invitation]);
		await act(async () => {
			await result.current.refetch();
		});
		await waitFor(() => expect(result.current.isError).toBe(false));
		expect(result.current.meetings).toHaveLength(1);
	});
});
