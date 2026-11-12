/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';

const mockCreateTimesheetFrom = jest.fn();
const mockToastError = jest.fn();

jest.mock('../auth', () => ({
	useAuthenticateUser: () => ({ user: { id: 'user-a' } })
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { createTimesheetFrom: (params: unknown) => mockCreateTimesheetFrom(params) }
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));

import { useCreateTimesheet } from './use-create-timesheet';

const entry = {
	startedAt: new Date(2026, 10, 10, 9, 0),
	stoppedAt: new Date(2026, 10, 10, 10, 30),
	taskId: 'task-a',
	employeeId: 'employee-a',
	isBillable: false,
	logType: ETimeLogType.MANUAL,
	source: ETimeLogSource.TEAMS
};

function renderCreateTimesheet() {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useCreateTimesheet(), { wrapper });
}

async function failedDescriptionOf(refusal: unknown) {
	mockCreateTimesheetFrom.mockRejectedValue(refusal);
	const { result } = renderCreateTimesheet();
	await act(async () => {
		await result.current.createTimesheet(entry).catch(() => undefined);
	});
	const [title, options] = mockToastError.mock.calls[0];
	return { title, description: options.description };
}

describe('useCreateTimesheet failure', () => {
	beforeEach(() => {
		mockCreateTimesheetFrom.mockReset();
		mockToastError.mockReset();
		// The hook logs every failure it rethrows
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('names the field the organization requires when the API refuses the entry for it', async () => {
		const refusal = new ApiErrorService('Bad request', 400, 'TRACKING_FIELD_REQUIRED', { fields: ['projectId'] });

		const failure = await failedDescriptionOf(refusal);

		expect(failure).toEqual({ title: 'toasts.MUTATION_FAILED', description: 'manualTime.REQUIRED.PROJECT' });
	});

	it('gives any other failure the reason of its status, as before', async () => {
		const failure = await failedDescriptionOf(new ApiErrorService('Forbidden', 403));

		expect(failure).toEqual({ title: 'toasts.MUTATION_FAILED', description: 'toasts.REASONS.PERMISSION' });
	});

	it('replaces its toast instead of stacking one for each period of a save', async () => {
		mockCreateTimesheetFrom.mockRejectedValue(new ApiErrorService('Forbidden', 403));
		const { result } = renderCreateTimesheet();

		await act(async () => {
			const saves = [result.current.createTimesheet(entry), result.current.createTimesheet(entry)];
			await Promise.allSettled(saves);
		});

		const toastIds = mockToastError.mock.calls.map(([, options]) => options.id);
		expect(toastIds).toEqual(['time-entry-not-saved', 'time-entry-not-saved']);
	});
});
