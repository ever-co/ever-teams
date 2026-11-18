import { QueryClient } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { queryPersister } from './query-persister';

describe('the saved query cache', () => {
	it('gives the answers back to the client of the next start', async () => {
		const before = new QueryClient();
		before.setQueryData(['timer', 'status'], { running: true, startedAt: '2026-11-18T09:00:00.000Z' });
		await persistQueryClientSave({ queryClient: before, persister: queryPersister });
		// the persister writes at most once a second, and this suite runs on fake timers
		await jest.advanceTimersByTimeAsync(1000);

		const after = new QueryClient();
		await persistQueryClientRestore({ queryClient: after, persister: queryPersister, maxAge: 60 * 60 * 1000 });

		expect(after.getQueryData(['timer', 'status'])).toEqual({
			running: true,
			startedAt: '2026-11-18T09:00:00.000Z'
		});
	});
});
