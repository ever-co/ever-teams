/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { periodOfPreset } from '@/core/lib/utils/dashboard-period';
import type { TimeActivityFilters } from '@/core/lib/utils/dashboards/time-activity';
import type { ISavedReport } from '@/core/types/interfaces/timesheet/saved-report';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockShare = jest.fn();
const mockUnshare = jest.fn();
const mockRetry = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
let mockSearchParams = new URLSearchParams();

interface SavedState {
	reports: ISavedReport[];
	availability: 'loading' | 'ready' | 'unsupported' | 'error';
	linkTokens: Record<string, string>;
}

let mockSaved: SavedState = { reports: [], availability: 'ready', linkTokens: {} };
/** Whether a change of a saved report is still waiting for its answer. */
let mockUpdatePending = false;

function mutation(mutateAsync: jest.Mock, isPending = false) {
	return { mutateAsync, isPending };
}

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'fr'
}));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams }));
jest.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args)
	}
}));
jest.mock('@/core/hooks/common/use-workspace-week-start', () => ({ useWorkspaceWeekStart: () => 1 }));
jest.mock('@/core/hooks/dashboards/time-activity/use-saved-reports', () => ({
	useSavedReports: () => ({
		...mockSaved,
		isLoading: false,
		retry: mockRetry,
		create: mutation(mockCreate),
		update: mutation(mockUpdate, mockUpdatePending),
		remove: mutation(mockRemove),
		share: mutation(mockShare),
		unshare: mutation(mockUnshare)
	})
}));
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuLabel: Pass,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({
			children,
			onClick,
			disabled
		}: {
			children?: ReactNode;
			onClick?: () => void;
			disabled?: boolean;
		}) => (
			<button type="button" disabled={disabled} onClick={onClick}>
				{children}
			</button>
		)
	};
});
jest.mock('@/core/components/common/popover', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
	return { Popover: Pass, PopoverTrigger: Pass, PopoverContent: Pass };
});
jest.mock('@/core/components/common/dialog', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
	return {
		Dialog: ({ open, children }: { open: boolean; children?: ReactNode }) => (open ? <div>{children}</div> : null),
		DialogContent: Pass,
		DialogHeader: Pass,
		DialogTitle: Pass
	};
});
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({
	AlertDialogConfirmation: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
		isOpen ? (
			<button type="button" onClick={onConfirm}>
				confirm delete
			</button>
		) : null
}));

import { TimeActivitySavedReports } from './time-activity-saved-reports';

const NO_FILTERS: TimeActivityFilters = {
	teamIds: [],
	employeeIds: [],
	projectIds: [],
	taskIds: [],
	clientIds: [],
	billable: []
};

const mockSetLinkParams = jest.fn();

function reportProps(filters: TimeActivityFilters = { ...NO_FILTERS, clientIds: ['client-a'] }) {
	return {
		period: periodOfPreset('lastMonth', 1),
		user: { id: 'user-1', tenantId: 'tenant-1', employee: { organizationId: 'organization-1' } },
		settings: { filters, grouping: 'project', setLinkParams: mockSetLinkParams }
	} as never;
}

/** What the link becomes after the last change asked of it. */
function linkAfterLastChange(current = '') {
	const change = mockSetLinkParams.mock.calls.at(-1)?.[0] as ((next: URLSearchParams) => void) | undefined;
	if (!change) {
		throw new Error('The link was never asked to change');
	}
	const next = new URLSearchParams(current);
	change(next);
	return next.toString();
}

const CLIENT_A: ISavedReport = {
	id: 'r1',
	authorId: 'user-1',
	name: 'Client A, last month',
	kind: 'TIME_AND_ACTIVITY',
	periodRule: 'lastMonth',
	startDate: null,
	endDate: null,
	filters: { clientIds: ['client-a'] },
	grouping: 'project',
	includeAmounts: false,
	isShared: false,
	sharedAt: null,
	shareExpiresAt: null
};

describe('TimeActivitySavedReports', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSearchParams = new URLSearchParams();
		mockSaved = { reports: [CLIENT_A], availability: 'ready', linkTokens: {} };
	});

	it('shows nothing against an API without saved reports, so the page works as before', () => {
		mockUpdatePending = false;
		mockSaved = { reports: [], availability: 'unsupported', linkTokens: {} };

		const { container } = render(<TimeActivitySavedReports report={reportProps()} />);

		expect(container.innerHTML).toBe('');
	});

	it('shows nothing until it is known whether the API has saved reports', () => {
		mockSaved = { reports: [], availability: 'loading', linkTokens: {} };

		const { container } = render(<TimeActivitySavedReports report={reportProps()} />);

		expect(container.innerHTML).toBe('');
	});

	it('saves the view shown under the name given, and names the new report in the link', async () => {
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		mockCreate.mockResolvedValue({ ...CLIENT_A, id: 'r2' });
		render(<TimeActivitySavedReports report={reportProps()} />);

		const [nameField] = screen.getAllByLabelText('dashboard.savedReports.NAME');
		fireEvent.change(nameField, { target: { value: '  Client A, last month ' } });
		fireEvent.submit(nameField.closest('form') as HTMLFormElement);

		await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
		expect(mockCreate.mock.calls[0][0]).toMatchObject({
			name: 'Client A, last month',
			periodRule: 'lastMonth',
			filters: { clientIds: ['client-a'] },
			grouping: 'project'
		});
		await waitFor(() => expect(mockSetLinkParams).toHaveBeenCalled());
		expect(linkAfterLastChange('period=lastMonth')).toBe('period=lastMonth&report=r2');
	});

	it('refuses an empty name and saves nothing', () => {
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		render(<TimeActivitySavedReports report={reportProps()} />);

		const [nameField] = screen.getAllByLabelText('dashboard.savedReports.NAME');
		fireEvent.submit(nameField.closest('form') as HTMLFormElement);

		expect(screen.getAllByText('dashboard.savedReports.NAME_REQUIRED').length).toBeGreaterThan(0);
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('opens a saved report in one click: its whole view replaces the one in the link', () => {
		render(<TimeActivitySavedReports report={reportProps(NO_FILTERS)} />);

		fireEvent.click(screen.getByText('Client A, last month'));

		expect(linkAfterLastChange('period=today&members=ada&groupBy=member')).toBe(
			'period=lastMonth&clients=client-a&groupBy=project&report=r1'
		);
	});

	it('offers to update the report it was opened from once the view changed, and saves the new view in it', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdate.mockResolvedValue(CLIENT_A);
		render(<TimeActivitySavedReports report={reportProps({ ...NO_FILTERS, clientIds: ['client-b'] })} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(false);
		fireEvent.click(update);

		await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
		expect(mockUpdate.mock.calls[0][0]).toMatchObject({
			id: 'r1',
			input: { filters: { clientIds: ['client-b'] } }
		});
	});

	it('has nothing to update while the view is the one saved', () => {
		mockSearchParams = new URLSearchParams('report=r1');
		render(<TimeActivitySavedReports report={reportProps()} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(true);
	});

	it('deletes the report it was opened from after the confirmation, and takes it out of the link', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockRemove.mockResolvedValue(undefined);
		render(<TimeActivitySavedReports report={reportProps()} />);

		fireEvent.click(screen.getByText('dashboard.savedReports.DELETE'));
		fireEvent.click(screen.getByText('confirm delete'));

		await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('r1'));
		await waitFor(() => expect(mockSetLinkParams).toHaveBeenCalled());
		expect(linkAfterLastChange('period=lastMonth&report=r1')).toBe('period=lastMonth');
	});

	it('turns the link of the open report on, with the end day picked', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockShare.mockResolvedValue({ token: 'tok', sharedAt: 'now', shareExpiresAt: null });
		render(<TimeActivitySavedReports report={reportProps()} />);

		fireEvent.change(screen.getByLabelText('dashboard.savedReports.ENDS_ON'), { target: { value: '2099-12-31' } });
		fireEvent.click(screen.getByText('dashboard.savedReports.TURN_ON'));

		await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
	it('offers no second update while one is still waiting for its answer', () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdatePending = true;
		render(<TimeActivitySavedReports report={reportProps({ ...NO_FILTERS, clientIds: ['client-b'] })} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(true);
		fireEvent.click(update);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

		expect(mockShare).toHaveBeenCalledWith({
			id: 'r1',
			expiresAt: new Date(2099, 11, 31, 23, 59, 59, 999).toISOString()
		});
	});

	it('shows the address of a link made during the visit, with the locale, and copies it', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockSaved = {
			reports: [{ ...CLIENT_A, isShared: true, sharedAt: '2026-11-14T10:00:00.000Z' }],
			availability: 'ready',
			linkTokens: { r1: 'tok-1' }
		};
		const writeText = jest.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		render(<TimeActivitySavedReports report={reportProps()} />);

		const address = `${window.location.origin}/fr/shared-report/tok-1`;
		expect(screen.getByDisplayValue(address)).toBeTruthy();
		fireEvent.click(screen.getByText('dashboard.savedReports.COPY'));

		await waitFor(() => expect(writeText).toHaveBeenCalledWith(address));
		expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.savedReports.COPIED');
	});

	it('says a link made earlier is on without its address, and turns it off', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockSaved = {
			reports: [{ ...CLIENT_A, isShared: true, sharedAt: '2026-11-14T10:00:00.000Z' }],
			availability: 'ready',
			linkTokens: {}
		};
		mockUnshare.mockResolvedValue(undefined);
		render(<TimeActivitySavedReports report={reportProps()} />);

		expect(screen.getByText('dashboard.savedReports.LINK_HIDDEN')).toBeTruthy();
		fireEvent.click(screen.getByText('dashboard.savedReports.TURN_OFF'));

		await waitFor(() => expect(mockUnshare).toHaveBeenCalledWith('r1'));
	});

	it('says why a link asked from an API token session is refused', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockShare.mockRejectedValue({ statusCode: 403, message: 'Forbidden' });
		render(<TimeActivitySavedReports report={reportProps()} />);

		fireEvent.click(screen.getByText('dashboard.savedReports.TURN_ON'));

		await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('dashboard.savedReports.SHARE_REFUSED'));
	});

	it('changes whether the link shows amounts', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdate.mockResolvedValue(CLIENT_A);
		render(<TimeActivitySavedReports report={reportProps()} />);

		fireEvent.click(screen.getByRole('switch'));

		await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ id: 'r1', input: { includeAmounts: true } }));
	});
});

	it('holds the amounts switch while its last change is waiting for its answer, so two writes never cross', () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdatePending = true;
		render(<TimeActivitySavedReports report={reportProps()} />);

		const amounts = screen.getByRole('switch') as HTMLButtonElement;
		expect(amounts.disabled).toBe(true);
		fireEvent.click(amounts);
		expect(mockUpdate).not.toHaveBeenCalled();
	});
