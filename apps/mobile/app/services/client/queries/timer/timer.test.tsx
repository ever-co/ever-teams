import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getTimerStatusRequest, syncTimeSlotRequest } from '../../requests/timer';
import { TimerSource } from '../../../interfaces/ITimer';
import { runAsBuild } from '../../../../../test/app-shell';
import useFetchTimerStatus from './timer';

jest.mock(
	'../../../../../src/navigation/next-shell-build',
	() => jest.requireActual('../../../../../test/app-shell').nextShellBuildStandIn
);
jest.mock('../../requests/timer', () => ({
	getTimerStatusRequest: jest.fn(() => Promise.resolve({ data: { running: true } })),
	syncTimeSlotRequest: jest.fn(() => Promise.resolve({ data: {} }))
}));

const KOFI = { tenantId: 'tenant-a', organizationId: 'org-a', authToken: 'kofi-token', employeeId: 'employee-kofi' };

async function readStatusWhileRunning(): Promise<void> {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = await renderHook(() => useFetchTimerStatus(KOFI, true, TimerSource.MOBILE), { wrapper });
	await waitFor(() => expect(result.current.isSuccess).toBe(true));
	client.clear();
}

describe('the timer status the current screens read every five seconds', () => {
	beforeEach(() => {
		jest.mocked(getTimerStatusRequest).mockClear();
		jest.mocked(syncTimeSlotRequest).mockClear();
	});

	it('writes the running time in the app people install', async () => {
		runAsBuild(undefined);

		await readStatusWhileRunning();

		expect(syncTimeSlotRequest).toHaveBeenCalledWith(expect.objectContaining({ duration: 5 }), 'kofi-token');
	});

	it('leaves the running time to the new heartbeat in builds of the new app, so it is written once', async () => {
		runAsBuild('next');

		await readStatusWhileRunning();

		expect(getTimerStatusRequest).toHaveBeenCalled();
		expect(syncTimeSlotRequest).not.toHaveBeenCalled();
	});
});
