/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'team-1',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn(), error: jest.fn() }) }
}));
jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { name: 'Fixture Manager', employee: { id: 'employee-1' } } })
}));

import { scheduledMeetingService } from '@/core/services/client/api/meetings';
import { useInvitedMeetings } from './use-invited-meetings';
import { useScheduledMeetings } from './use-scheduled-meetings';

/**
 * The browser gate's Gauzy double (`cypress/support/mock-gauzy-server.mjs`), as the web app meets it: it keeps the
 * appointments of the session, and answers every other GET, `/employee-appointment/invited` included, with an empty
 * page. Like the Gauzy of Teams prod, it has no invitations route, and it reads no `inviteeEmployeeIds`.
 */
function installGauzyDouble() {
	const appointments: Record<string, unknown>[] = [];
	const posted: Record<string, unknown>[] = [];
	jest.spyOn(scheduledMeetingService, 'get').mockImplementation(async (url: string) => {
		const path = url.split('?')[0];
		// A copy, as the double's JSON over HTTP is: a page read earlier never changes under the app
		const items = path === '/employee-appointment' ? appointments.map((appointment) => ({ ...appointment })) : [];
		return { data: { items, total: items.length } } as never;
	});
	jest.spyOn(scheduledMeetingService, 'post').mockImplementation(async (_url: string, body?: unknown) => {
		const appointment = { id: `appointment-${appointments.length + 1}`, status: null, ...(body as object) };
		appointments.push(appointment);
		posted.push(body as Record<string, unknown>);
		return { data: appointment } as never;
	});
	return { posted };
}

function renderMeetingsPageData() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	// What the meetings page reads: one's own meetings and those one is invited to
	return renderHook(() => ({ own: useScheduledMeetings(), invited: useInvitedMeetings() }), { wrapper });
}

const start = new Date(Date.now() + 2 * 60 * 60 * 1000);

/** A meeting with a team member and an address typed, as the gate's emails test schedules it. */
const kickOff = {
	title: 'Kick-off',
	start,
	durationMinutes: 30,
	link: 'https://app.example.com/meet/jitsi?room=kick&title=Kick-off',
	participantEmails: ['teammate@example.test', 'guest@example.org'],
	invitees: [{ email: 'teammate@example.test', name: 'Fixture Teammate', employeeId: 'employee-2' }]
};

async function scheduleKickOff(own: ReturnType<typeof useScheduledMeetings>) {
	await act(async () => {
		await own.scheduleMeeting(kickOff);
	});
}

describe('the meetings page on a Gauzy without the invitations route (the browser gate, Teams prod)', () => {
	afterEach(() => jest.restoreAllMocks());

	it('lists the meeting one schedules, and says nothing failed', async () => {
		installGauzyDouble();
		const { result } = renderMeetingsPageData();
		await waitFor(() => expect(result.current.invited.isLoading || result.current.own.isLoading).toBe(false));
		expect(result.current.own.meetings).toEqual([]);
		expect(result.current.invited.isError).toBe(false);

		await act(async () => {
			await result.current.own.scheduleMeeting({
				title: 'Sprint review',
				start,
				durationMinutes: 30,
				link: 'https://app.example.com/meet/jitsi?room=abc&title=Sprint%20review'
			});
		});

		await waitFor(() =>
			expect(result.current.own.meetings.map((meeting) => meeting.title)).toEqual(['Sprint review'])
		);
		expect(result.current.invited.meetings).toEqual([]);
		expect(result.current.invited.isError).toBe(false);
	});

	it("sends a team member and a typed address as the appointment's emails, as before #5330", async () => {
		const { posted } = installGauzyDouble();
		const { result } = renderMeetingsPageData();
		// The agenda has read the invitations first, as on the page
		await waitFor(() => expect(result.current.invited.isLoading).toBe(false));

		await scheduleKickOff(result.current.own);

		expect(posted).toHaveLength(1);
		expect(posted[0].emails).toBe('teammate@example.test, guest@example.org');
		expect(posted[0]).not.toHaveProperty('inviteeEmployeeIds');
	});

	it('invites the team members as members on a Gauzy that lists invitations', async () => {
		const { posted } = installGauzyDouble();
		jest.spyOn(scheduledMeetingService, 'getInvitedMeetings').mockResolvedValue([]);
		const { result } = renderMeetingsPageData();
		await waitFor(() => expect(result.current.invited.isLoading).toBe(false));

		await scheduleKickOff(result.current.own);

		expect(posted[0].emails).toBe('guest@example.org');
		expect(posted[0].inviteeEmployeeIds).toEqual(['employee-2']);
	});
});
