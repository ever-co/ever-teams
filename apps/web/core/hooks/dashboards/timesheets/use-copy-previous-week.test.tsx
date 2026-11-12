/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { sheetDaysOf } from '@/core/lib/utils/dashboards/timesheets';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogs = jest.fn();
const mockApplyCopyPlan = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => {
	const toast = Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() });
	return { toast };
});
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));

import { type CopyPreviousWeekInput, useCopyPreviousWeek } from './use-copy-previous-week';
import type { SheetCellWrites } from './use-sheet-cell-writes';

const period: Period = { from: new Date(2024, 0, 8), to: new Date(2024, 0, 14) };
const days = sheetDaysOf(period, []);

const SHEET_OF_FIRST_MEMBER = 'member-a:2024-01-08:2024-01-14';
const SHEET_OF_SECOND_MEMBER = 'member-b:2024-01-08:2024-01-14';

const lastWeekLog: ITimeLog = {
	id: 'last-week',
	duration: 0,
	version: '1',
	logType: ETimeLogType.MANUAL,
	employeeId: 'member-a',
	projectId: 'project',
	taskId: 'task',
	startedAt: new Date(2024, 0, 1, 9),
	stoppedAt: new Date(2024, 0, 1, 11)
};

const writes: SheetCellWrites = {
	commitCell: jest.fn(),
	applyCopyPlan: (...args: unknown[]) => mockApplyCopyPlan(...args),
	fitCopyPlans: (plans) => ({ fitting: [...plans], withoutRoomCount: 0 }),
	savingCellKeys: new Set(),
	isCopying: false
};

function inputOf(overrides: Partial<CopyPreviousWeekInput>): CopyPreviousWeekInput {
	return {
		sheetKey: SHEET_OF_FIRST_MEMBER,
		period,
		logsScope: { tenantId: 'tenant', organizationId: 'organization', userTimeZone: 'UTC' },
		memberId: 'member-a',
		days,
		rows: [],
		dayLockOf: () => 'none',
		addRows: jest.fn(),
		writes,
		...overrides
	};
}

function renderCopy(initialProps: CopyPreviousWeekInput) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook((props: CopyPreviousWeekInput) => useCopyPreviousWeek(props), { wrapper, initialProps });
}

describe('useCopyPreviousWeek', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('drops a copy prepared for one member once another member is shown', async () => {
		mockGetTimeLogs.mockResolvedValue([lastWeekLog]);
		const { result, rerender } = renderCopy(inputOf({}));

		await act(async () => {
			await result.current.prepareRowsAndTime();
		});
		expect(result.current.pendingCopy?.plans).toHaveLength(1);

		rerender(inputOf({ sheetKey: SHEET_OF_SECOND_MEMBER, memberId: 'member-b' }));
		expect(result.current.pendingCopy).toBeNull();

		await act(async () => {
			await result.current.confirmCopy();
		});
		expect(mockApplyCopyPlan).not.toHaveBeenCalled();
	});

	it("discards last week's read when it answers after another member is shown", async () => {
		let answer: (logs: ITimeLog[]) => void = () => undefined;
		const slowRead = new Promise<ITimeLog[]>((resolve) => {
			answer = resolve;
		});
		mockGetTimeLogs.mockReturnValue(slowRead);
		const addRows = jest.fn();
		const { result, rerender } = renderCopy(inputOf({ addRows }));

		let preparing: Promise<void> = Promise.resolve();
		act(() => {
			preparing = result.current.prepareRowsAndTime();
		});
		rerender(inputOf({ sheetKey: SHEET_OF_SECOND_MEMBER, memberId: 'member-b', addRows }));
		await act(async () => {
			answer([lastWeekLog]);
			await preparing;
		});

		expect(result.current.pendingCopy).toBeNull();
		expect(addRows).not.toHaveBeenCalled();
	});
});
