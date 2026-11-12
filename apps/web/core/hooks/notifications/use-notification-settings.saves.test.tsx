/** @jest-environment jsdom */
/**
 * A save of the delivery preferences is seen as in flight by every reader of the setting, not only by the one that
 * started it: the settings page saves a threshold while the timer reminders read it from another instance (#5022),
 * and the value shown may yet be refused.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const SCOPE = { tenantId: 'tenant-1', organizationId: 'organization-1', receiverEmployeeId: 'employee-1' };
const mockCreate = jest.fn();

jest.mock('./use-notification-scope', () => ({ useNotificationScope: () => SCOPE }));
jest.mock('@/core/services/client/api/notifications', () => ({
	employeeNotificationSettingService: {
		getForEmployee: jest.fn(async () => null),
		create: (...args: unknown[]) => mockCreate(...args),
		update: jest.fn()
	}
}));

import { useNotificationSettings } from './use-notification-settings';

function renderTwoReaders() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const page = renderHook(() => useNotificationSettings(), { wrapper });
	const reminders = renderHook(() => useNotificationSettings(), { wrapper });
	return { page, reminders };
}

describe('useNotificationSettings, a save of the preferences', () => {
	beforeEach(() => {
		mockCreate.mockReset();
	});

	it('is in flight for every reader of the setting until Gauzy answers', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockCreate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		const { page, reminders } = renderTwoReaders();
		await waitFor(() => expect(reminders.result.current.isLoading).toBe(false));

		let saving: Promise<unknown> = Promise.resolve();
		act(() => {
			saving = page.result.current.savePreferences({ timerReminderHours: 2 });
		});

		await waitFor(() => expect(reminders.result.current.isSavingPreferences).toBe(true));
		expect(page.result.current.isSavingPreferences).toBe(true);

		await act(async () => {
			answer({ id: 'setting-1', preferences: { timerReminderHours: 2 } });
			await saving;
		});
		await waitFor(() => expect(reminders.result.current.isSavingPreferences).toBe(false));
	});

	it('is not a switch of a notification type, which leaves the threshold alone', async () => {
		mockCreate.mockReturnValue(new Promise(() => undefined));
		const { page, reminders } = renderTwoReaders();
		await waitFor(() => expect(reminders.result.current.isLoading).toBe(false));

		act(() => {
			void page.result.current.toggle({ key: 'mention', isOn: false });
		});

		await waitFor(() => expect(page.result.current.pendingKey).toBe('mention'));
		expect(reminders.result.current.isSavingPreferences).toBe(false);
	});
});
