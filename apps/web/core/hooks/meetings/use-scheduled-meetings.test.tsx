/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockRescheduleMeeting = jest.fn();
const mockGetScheduledMeetings = jest.fn();
const mockScheduleMeeting = jest.fn();
const mockGetInvitedMeetings = jest.fn();

jest.mock('@/core/services/client/api/meetings', () => ({
	scheduledMeetingService: {
		getScheduledMeetings: (...args: unknown[]) => mockGetScheduledMeetings(...args),
		rescheduleMeeting: (...args: unknown[]) => mockRescheduleMeeting(...args),
		scheduleMeeting: (...args: unknown[]) => mockScheduleMeeting(...args),
		getInvitedMeetings: (...args: unknown[]) => mockGetInvitedMeetings(...args)
	}
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { name: 'Ruslan Konviser', employee: { id: 'employee-1' } } })
}));

import { queryKeys } from '@/core/query/keys';
import { useScheduledMeetings } from './use-scheduled-meetings';

function renderScheduledMeetings(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useScheduledMeetings(), { wrapper });
}

/** An API error as the client's service raises it: its HTTP status on `statusCode`. */
const apiError = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });

/** A meeting with a team member and a guest among its participants. */
const draft = {
	title: 'Sprint review',
	start: new Date('2026-11-20T14:00:00.000Z'),
	durationMinutes: 30,
	link: 'https://app.example.com/meet/jitsi?room=abc',
	participantEmails: ['ana@acme.com', 'guest@example.org'],
	invitees: [{ email: 'ana@acme.com', name: 'Ana Silva', employeeId: 'employee-ana' }]
};

describe('useScheduledMeetings', () => {
	beforeEach(() => {
		mockGetScheduledMeetings.mockReset().mockResolvedValue([]);
		mockRescheduleMeeting.mockReset().mockResolvedValue(undefined);
		mockScheduleMeeting.mockReset().mockResolvedValue({ id: 'appointment-1' });
		mockGetInvitedMeetings.mockReset().mockResolvedValue([]);
	});

	it.each([404, 406])(
		'on an older Gauzy, whose invitations route answers %i, emails every participant as before #5022',
		async (status) => {
			mockGetInvitedMeetings.mockRejectedValue(apiError(status));
			const { result } = renderScheduledMeetings();

			await act(async () => {
				await result.current.scheduleMeeting(draft);
			});

			expect(mockScheduleMeeting).toHaveBeenCalledTimes(1);
			const [input] = mockScheduleMeeting.mock.calls[0];
			expect(input.emails).toBe('ana@acme.com, guest@example.org');
			expect(input).not.toHaveProperty('inviteeEmployeeIds');
		}
	);

	it.each([
		{
			agenda: 'listed the invitations',
			answer: () => Promise.resolve([]),
			emails: 'guest@example.org',
			members: ['employee-ana']
		},
		{
			agenda: 'met a missing route (406)',
			answer: () => Promise.reject(apiError(406)),
			emails: 'ana@acme.com, guest@example.org',
			members: undefined
		}
	])(
		'reuses the answer of an agenda that $agenda, asking the platform nothing more',
		async ({ answer, emails, members }) => {
			const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
			await queryClient.prefetchQuery({ queryKey: queryKeys.meetings.invited('employee-1'), queryFn: answer });
			const { result } = renderScheduledMeetings(queryClient);

			await act(async () => {
				await result.current.scheduleMeeting(draft);
			});

			expect(mockGetInvitedMeetings).not.toHaveBeenCalled();
			const [input] = mockScheduleMeeting.mock.calls[0];
			expect(input.emails).toBe(emails);
			expect(input.inviteeEmployeeIds).toEqual(members);
		}
	);

	it('on a Gauzy that lists invitations, invites the team members as members and emails the others (#5022)', async () => {
		const { result } = renderScheduledMeetings();

		await act(async () => {
			await result.current.scheduleMeeting(draft);
		});

		expect(mockGetInvitedMeetings).toHaveBeenCalledTimes(1);
		const [input] = mockScheduleMeeting.mock.calls[0];
		expect(input.inviteeEmployeeIds).toEqual(['employee-ana']);
		expect(input.emails).toBe('guest@example.org');
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
