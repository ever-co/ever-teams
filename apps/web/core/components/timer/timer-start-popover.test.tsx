/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import { timerStatusState } from '@/core/stores/timer/timer';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

const mockMoveStart = jest.fn();
let mockSupport = 'supported';
let mockPermissions: string[] = [];
let mockPermissionsLoaded = true;
const mockToastSuccess = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en-GB'
}));
jest.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({
		myPermissions: mockPermissions,
		isLoaded: mockPermissionsLoaded,
		isLoading: false
	})
}));
jest.mock('@/core/hooks/timer/use-timer-start-move', () => ({
	useTimerStartMoveSupport: () => mockSupport,
	useMoveTimerStart: () => ({ moveStart: mockMoveStart, saving: false, reset: jest.fn() })
}));
const mockGetCurrentOrganization = jest.fn();
let mockOrganizationReadFailed = false;
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: (options: unknown) => {
		mockGetCurrentOrganization(options);
		return { isError: mockOrganizationReadFailed, refetch: jest.fn() };
	}
}));

import { TimerStartPopover } from './timer-start-popover';

const EDITOR = ['TIME_TRACKER', 'ALLOW_MODIFY_TIME', 'ALLOW_MANUAL_TIME'];
const OPEN_ORGANIZATION = { id: 'org-1', allowModifyTime: true, allowManualTime: true, requireReason: false };

function renderTimer({
	source = 'TEAMS',
	running = true,
	organization = OPEN_ORGANIZATION
}: { source?: string; running?: boolean; organization?: Record<string, unknown> | null } = {}) {
	const store = createStore();
	store.set(timerStatusState, {
		running,
		duration: 600,
		lastLog: { id: 'log-1', source, startedAt: new Date(2026, 10, 16, 9, 25, 12).toISOString() }
	} as never);
	store.set(currentOrganizationState, organization as never);
	render(
		<Provider store={store}>
			<TimerStartPopover>00:10:00</TimerStartPopover>
		</Provider>
	);
}

function openPanel() {
	fireEvent.click(screen.getByRole('button', { name: /timer\.startMove\.OPEN/ }));
}

beforeEach(() => {
	jest.useFakeTimers({
		now: new Date(2026, 10, 16, 10, 0, 0),
		doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval']
	});
	mockSupport = 'supported';
	mockPermissions = EDITOR;
	mockOrganizationReadFailed = false;
	mockPermissionsLoaded = true;
});

afterEach(() => {
	jest.useRealTimers();
	jest.clearAllMocks();
});

describe('TimerStartPopover', () => {
	it('draws the clock as it is while no timer runs', () => {
		renderTimer({ running: false });

		expect(screen.getByText('00:10:00')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('makes the running time a button that names the start of the run', () => {
		renderTimer();

		const trigger = screen.getByRole('button', { name: /timer\.startMove\.OPEN/ });
		expect(trigger.textContent).toBe('00:10:00');
		expect(trigger.getAttribute('aria-label')).toContain('9:25');
	});

	it('moves the start to the time typed and closes', async () => {
		mockMoveStart.mockResolvedValue({ data: {} });
		renderTimer();
		openPanel();

		fireEvent.change(screen.getByLabelText(/timer\.startMove\.NEW_START/), { target: { value: '09:00' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});

		expect(mockMoveStart).toHaveBeenCalledWith({ startedAt: new Date(2026, 10, 16, 9, 0), reason: '' });
		expect(mockToastSuccess).toHaveBeenCalled();
		const trigger = screen.getByRole('button', { name: /timer\.startMove\.OPEN/ });
		expect(trigger.getAttribute('data-state')).toBe('closed');
	});

	it('says why the API refused the move, and keeps the panel open', async () => {
		mockMoveStart.mockRejectedValue({ statusCode: 409, errorCode: 'TIMER_START_OVERLAP' });
		renderTimer();
		openPanel();

		fireEvent.change(screen.getByLabelText(/timer\.startMove\.NEW_START/), { target: { value: '09:00' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});

		expect(screen.getByRole('alert').textContent).toBe('timer.startMove.OVERLAP');
		expect(screen.getByLabelText(/timer\.startMove\.NEW_START/)).toBeTruthy();
	});

	it('refuses a start later than now without asking the API', async () => {
		renderTimer();
		openPanel();

		fireEvent.change(screen.getByLabelText(/timer\.startMove\.NEW_START/), { target: { value: '10:30' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});

		expect(screen.getByRole('alert').textContent).toBe('timer.startMove.IN_FUTURE');
		expect(mockMoveStart).not.toHaveBeenCalled();
	});

	it('offers only a later start where time added by hand is not allowed', async () => {
		renderTimer({ organization: { ...OPEN_ORGANIZATION, allowManualTime: false } });
		openPanel();

		expect(screen.getByText('timer.startMove.LATER_ONLY')).toBeTruthy();
		fireEvent.change(screen.getByLabelText(/timer\.startMove\.NEW_START/), { target: { value: '09:00' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});
		expect(screen.getByRole('alert').textContent).toBe('timer.startMove.MANUAL_NOT_ALLOWED');
		expect(mockMoveStart).not.toHaveBeenCalled();
	});

	it('asks for the reason the organization requires', () => {
		renderTimer({ organization: { ...OPEN_ORGANIZATION, requireReason: true } });
		openPanel();

		expect(screen.getByLabelText(/timer\.startMove\.REASON/)).toBeTruthy();
	});

	it('keeps Save off until the start changes', () => {
		renderTimer();
		openPanel();

		const save = screen.getByRole<HTMLButtonElement>('button', { name: 'common.SAVE' });
		expect(save.disabled).toBe(true);
	});

	it.each([
		[
			'the organization does not let tracked time change',
			{ organization: { ...OPEN_ORGANIZATION, allowModifyTime: false } },
			'timer.startMove.VIEW_NOT_ALLOWED'
		],
		['the run belongs to the desktop app', { source: 'DESKTOP' }, 'timer.startMove.VIEW_TRACKER']
	])('shows the start without the field when %s', (_case, options, messageKey) => {
		renderTimer(options);
		openPanel();

		expect(screen.getByText(messageKey)).toBeTruthy();
		expect(screen.queryByLabelText(/timer\.startMove\.NEW_START/)).toBeNull();
	});

	it("reads the organization's rules when the panel opens, and waits for them", () => {
		renderTimer({ organization: null });

		expect(mockGetCurrentOrganization).toHaveBeenLastCalledWith({ enabled: false });
		openPanel();

		expect(mockGetCurrentOrganization).toHaveBeenLastCalledWith({ enabled: true });
		expect(screen.getByText('timer.startMove.CHECKING')).toBeTruthy();
		expect(screen.queryByLabelText(/timer\.startMove\.NEW_START/)).toBeNull();
	});

	it('leaves the rules to the API when the permissions cannot be read', () => {
		mockPermissionsLoaded = false;
		mockPermissions = [];
		renderTimer();
		openPanel();

		expect(screen.getByLabelText(/timer.startMove.NEW_START/)).toBeTruthy();
	});

	it('leaves the rules to the API when the organization cannot be read', () => {
		mockOrganizationReadFailed = true;
		renderTimer({ organization: null });
		openPanel();

		expect(screen.getByLabelText(/timer\.startMove\.NEW_START/)).toBeTruthy();
	});

	it('asks for the reason when the API says the organization requires one', async () => {
		mockMoveStart.mockRejectedValue({ statusCode: 400, errorCode: 'TIMER_START_REASON_REQUIRED' });
		renderTimer();
		openPanel();

		fireEvent.change(screen.getByLabelText(/timer\.startMove\.NEW_START/), { target: { value: '09:00' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});

		expect(screen.getByRole('alert').textContent).toBe('timer.startMove.REASON_REQUIRED');
		expect(screen.getByLabelText(/^timer\.startMove\.REASON/)).toBeTruthy();
	});

	it('shows the start without the field against an API that cannot move it', () => {
		mockSupport = 'unsupported';
		renderTimer();
		openPanel();

		expect(screen.getByText('timer.startMove.UNSUPPORTED')).toBeTruthy();
		expect(screen.queryByLabelText(/timer\.startMove\.NEW_START/)).toBeNull();
	});
});
