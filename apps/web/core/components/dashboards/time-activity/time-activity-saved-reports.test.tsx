/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
/** What is known of the connected Gauzy and the labels of entries on a saved report (ever-gauzy#12073). */
let mockLabelsSupport: 'kept' | 'not-kept' | 'checking' | 'failed' = 'not-kept';
const mockLabelsSupportAsked = jest.fn();
const mockLabelsSupportRetry = jest.fn();

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
jest.mock('@/core/hooks/dashboards/time-activity/use-saved-report-labels-support', () => ({
	useSavedReportLabelsSupport: (isNeeded: boolean) => {
		mockLabelsSupportAsked(isNeeded);
		return {
			keepsEntryLabels: mockLabelsSupport === 'kept',
			support: mockLabelsSupport,
			retry: mockLabelsSupportRetry
		};
	}
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
			<button type="button" data-menu-item="true" disabled={disabled} onClick={onClick}>
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
	billable: [],
	entryLabels: []
};

const mockSetLinkParams = jest.fn();

function reportProps(
	filters: TimeActivityFilters = { ...NO_FILTERS, clientIds: ['client-a'] },
	setLinkParams: jest.Mock = mockSetLinkParams
) {
	return {
		period: periodOfPreset('lastMonth', 1),
		user: { id: 'user-1', tenantId: 'tenant-1', employee: { organizationId: 'organization-1' } },
		settings: { filters, grouping: 'project', linkParams: mockSearchParams, setLinkParams }
	} as never;
}

/** What the link becomes after the last change asked of it. */
function linkAfterLastChange(current = '', setLinkParams: jest.Mock = mockSetLinkParams) {
	const change = setLinkParams.mock.calls.at(-1)?.[0] as ((next: URLSearchParams) => void) | undefined;
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
		mockUpdatePending = false;
	});

	it('shows nothing against an API without saved reports, so the page works as before', () => {
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

	it('names the new report in the link as it is once saved, keeping a filter changed while the save was pending', async () => {
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		let answerSave: (report: ISavedReport) => void = () => undefined;
		mockCreate.mockReturnValue(
			new Promise<ISavedReport>((resolve) => {
				answerSave = resolve;
			})
		);
		const { rerender } = render(<TimeActivitySavedReports report={reportProps()} />);
		const [nameField] = screen.getAllByLabelText('dashboard.savedReports.NAME');
		fireEvent.change(nameField, { target: { value: 'Client A, last month' } });
		fireEvent.submit(nameField.closest('form') as HTMLFormElement);
		await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

		// The member picks client B while the save is pending: the page's link moved on
		const setLaterLinkParams = jest.fn();
		rerender(
			<TimeActivitySavedReports
				report={reportProps({ ...NO_FILTERS, clientIds: ['client-b'] }, setLaterLinkParams)}
			/>
		);
		await act(async () => answerSave({ ...CLIENT_A, id: 'r2' }));

		expect(mockSetLinkParams).not.toHaveBeenCalled();
		expect(linkAfterLastChange('period=lastMonth&clients=client-b', setLaterLinkParams)).toBe(
			'period=lastMonth&clients=client-b&report=r2'
		);
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

	it('offers no second update while one is still waiting for its answer', () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdatePending = true;
		render(<TimeActivitySavedReports report={reportProps({ ...NO_FILTERS, clientIds: ['client-b'] })} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(true);
		fireEvent.click(update);
		expect(mockUpdate).not.toHaveBeenCalled();
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

	it('leaves the link alone when it names another report by the time the delete is done', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockRemove.mockResolvedValue(undefined);
		render(<TimeActivitySavedReports report={reportProps()} />);

		fireEvent.click(screen.getByText('dashboard.savedReports.DELETE'));
		fireEvent.click(screen.getByText('confirm delete'));

		await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('r1'));
		await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
		expect(linkAfterLastChange('period=today&report=r9')).toBe('period=today&report=r9');
	});

	it('turns the link of the open report on, with the end day picked', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockShare.mockResolvedValue({ token: 'tok', sharedAt: 'now', shareExpiresAt: null });
		render(<TimeActivitySavedReports report={reportProps()} />);

		fireEvent.change(screen.getByLabelText('dashboard.savedReports.ENDS_ON'), { target: { value: '2099-12-31' } });
		fireEvent.click(screen.getByText('dashboard.savedReports.TURN_ON'));

		await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1));
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

		const address = `${window.location.origin}/fr/shared-report#token=tok-1`;
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

	it('holds the amounts switch while its last change is waiting for its answer, so two writes never cross', () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdatePending = true;
		render(<TimeActivitySavedReports report={reportProps()} />);

		const amounts = screen.getByRole('switch') as HTMLButtonElement;
		expect(amounts.disabled).toBe(true);
		fireEvent.click(amounts);
		expect(mockUpdate).not.toHaveBeenCalled();
	});
});

/** A view a saved report cannot keep (#5368): narrowed by the labels of entries, or grouped by label. */
const LABEL_VIEWS: [string, TimeActivityFilters, string][] = [
	['narrowed by a label', { ...NO_FILTERS, entryLabels: ['design'] }, 'project'],
	['narrowed to the time without a label', { ...NO_FILTERS, entryLabels: ['no-label'] }, 'project'],
	['grouped by label', NO_FILTERS, 'label']
];

function labelViewProps(filters: TimeActivityFilters, grouping: string) {
	return {
		period: periodOfPreset('lastMonth', 1),
		user: { id: 'user-1', tenantId: 'tenant-1', employee: { organizationId: 'organization-1' } },
		settings: { filters, grouping, linkParams: mockSearchParams, setLinkParams: mockSetLinkParams }
	} as never;
}

describe('TimeActivitySavedReports and the labels a saved report does not keep', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSearchParams = new URLSearchParams();
		mockSaved = { reports: [CLIENT_A], availability: 'ready', linkTokens: {} };
		mockUpdatePending = false;
	});

	it.each(LABEL_VIEWS)('offers no save of a view %s, and says why', (_case, filters, grouping) => {
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		render(<TimeActivitySavedReports report={labelViewProps(filters, grouping)} />);

		// Neither Save nor the save that Share asks for first offers a name to save the view under
		expect(screen.queryAllByLabelText('dashboard.savedReports.NAME')).toHaveLength(0);
		expect(screen.getAllByText('dashboard.savedReports.LABELS_NOT_KEPT')).toHaveLength(2);
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it.each(LABEL_VIEWS)(
		'never writes a view %s over the report it was opened from, and says why',
		(_case, filters, grouping) => {
			mockSearchParams = new URLSearchParams('report=r1');
			render(<TimeActivitySavedReports report={labelViewProps(filters, grouping)} />);

			const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
			expect(update.disabled).toBe(true);
			fireEvent.click(update);
			expect(mockUpdate).not.toHaveBeenCalled();
			expect(screen.getAllByText('dashboard.savedReports.LABELS_NOT_KEPT').length).toBeGreaterThan(0);
		}
	);

	it('still shares the report it was opened from, which keeps its own view', () => {
		mockSearchParams = new URLSearchParams('report=r1');
		render(
			<TimeActivitySavedReports report={labelViewProps({ ...NO_FILTERS, entryLabels: ['design'] }, 'label')} />
		);

		expect(screen.getByText('dashboard.savedReports.TURN_ON')).toBeTruthy();
	});

	it('opens a saved report without any label of the view it replaces', () => {
		render(
			<TimeActivitySavedReports report={labelViewProps({ ...NO_FILTERS, entryLabels: ['design'] }, 'label')} />
		);

		fireEvent.click(screen.getByText('Client A, last month'));

		expect(linkAfterLastChange('period=today&entryLabels=design&groupBy=label')).toBe(
			'period=lastMonth&clients=client-a&groupBy=project&report=r1'
		);
	});
});

describe('TimeActivitySavedReports on a Gauzy that keeps the labels of entries (ever-gauzy#12073)', () => {
	const DESIGN_WITHOUT_LABEL: TimeActivityFilters = { ...NO_FILTERS, entryLabels: ['design', 'no-label'] };
	const DESIGN_REPORT: ISavedReport = {
		...CLIENT_A,
		id: 'r2',
		name: 'Design, by label',
		filters: { tagIds: ['design'], untagged: true },
		grouping: 'label'
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockSearchParams = new URLSearchParams();
		mockSaved = { reports: [CLIENT_A, DESIGN_REPORT], availability: 'ready', linkTokens: {} };
		mockUpdatePending = false;
		mockLabelsSupport = 'kept';
	});

	afterEach(() => {
		mockLabelsSupport = 'not-kept';
	});

	it('asks Gauzy only once a view or the report it was opened from uses labels', () => {
		render(<TimeActivitySavedReports report={labelViewProps(NO_FILTERS, 'project')} />);
		expect(mockLabelsSupportAsked).toHaveBeenLastCalledWith(false);

		render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'project')} />);
		expect(mockLabelsSupportAsked).toHaveBeenLastCalledWith(true);

		mockSearchParams = new URLSearchParams('report=r2');
		render(<TimeActivitySavedReports report={labelViewProps(NO_FILTERS, 'project')} />);
		expect(mockLabelsSupportAsked).toHaveBeenLastCalledWith(true);
	});

	it.each(['loading', 'unsupported'] as const)(
		'asks Gauzy nothing while its saved reports are %s: a 404 then says nothing of labels',
		(availability) => {
			mockSaved = { reports: [], availability, linkTokens: {} };
			render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

			expect(mockLabelsSupportAsked).toHaveBeenLastCalledWith(false);
		}
	);

	it('asks Gauzy once its saved reports answered, even with a list that could not be read', () => {
		mockSaved = { reports: [], availability: 'error', linkTokens: {} };
		render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

		expect(mockLabelsSupportAsked).toHaveBeenLastCalledWith(true);
	});

	/** A link that asks for labels, while the page still shows the view without them (`effectiveGroupingOf`). */
	function standInOfLabelLink() {
		const props = labelViewProps(NO_FILTERS, 'date') as unknown as { settings: { linkParams: URLSearchParams } };
		props.settings.linkParams = new URLSearchParams(
			`period=lastMonth&entryLabels=design&groupBy=label${mockSearchParams.has('report') ? '&report=r1' : ''}`
		);
		return props as never;
	}

	it.each(['checking', 'failed'] as const)(
		'writes nothing while a link asks for labels the view does not show yet (%s)',
		(support) => {
			mockLabelsSupport = support;
			mockSearchParams = new URLSearchParams('report=r1');
			render(<TimeActivitySavedReports report={standInOfLabelLink()} />);

			expect(mockLabelsSupportAsked).toHaveBeenLastCalledWith(true);
			expect(screen.queryAllByLabelText('dashboard.savedReports.NAME')).toHaveLength(0);
			const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
			expect(update.disabled).toBe(true);
			fireEvent.click(update);
			expect(mockUpdate).not.toHaveBeenCalled();
		}
	);

	it('saves the view shown once entries are known to have no labels, as before', () => {
		mockLabelsSupport = 'not-kept';
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		render(<TimeActivitySavedReports report={standInOfLabelLink()} />);

		expect(screen.getAllByLabelText('dashboard.savedReports.NAME').length).toBeGreaterThan(0);
		expect(screen.queryByText('dashboard.savedReports.LABELS_NOT_KEPT')).toBeNull();
	});

	it.each(LABEL_VIEWS)('saves a view %s, with its labels and its grouping', async (_case, filters, grouping) => {
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		mockCreate.mockResolvedValue({ ...DESIGN_REPORT, id: 'r3' });
		render(<TimeActivitySavedReports report={labelViewProps(filters, grouping)} />);

		expect(screen.queryByText('dashboard.savedReports.LABELS_NOT_KEPT')).toBeNull();
		const [nameField] = screen.getAllByLabelText('dashboard.savedReports.NAME');
		fireEvent.change(nameField, { target: { value: 'By label' } });
		fireEvent.submit(nameField.closest('form') as HTMLFormElement);

		await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
		const sent = mockCreate.mock.calls[0][0];
		const isNarrowed = filters.entryLabels.length > 0;
		const tagIds = filters.entryLabels.filter((value) => value !== 'no-label');
		const untagged = filters.entryLabels.includes('no-label');
		expect(sent.grouping).toBe(grouping);
		// A view grouped by label but not narrowed by labels sends the filters an older Gauzy takes
		expect('tagIds' in sent.filters).toBe(isNarrowed);
		expect(sent.filters).toMatchObject(isNarrowed ? { tagIds, untagged } : {});
	});

	it('writes a view narrowed by labels over the report it was opened from, with the labels', async () => {
		mockSearchParams = new URLSearchParams('report=r1');
		mockUpdate.mockResolvedValue(CLIENT_A);
		render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(false);
		expect(screen.queryByText('dashboard.savedReports.LABELS_NOT_KEPT')).toBeNull();
		fireEvent.click(update);

		await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
		expect(mockUpdate.mock.calls[0][0]).toMatchObject({
			id: 'r1',
			input: { filters: { tagIds: ['design'], untagged: true }, grouping: 'label' }
		});
	});

	it('opens a report saved with labels on its labels and its Label grouping', () => {
		render(<TimeActivitySavedReports report={labelViewProps(NO_FILTERS, 'project')} />);

		fireEvent.click(screen.getByText('Design, by label'));

		expect(linkAfterLastChange('period=today&clients=client-a')).toBe(
			'period=lastMonth&entryLabels=design%2Cno-label&groupBy=label&report=r2'
		);
	});

	it('knows the view of a report saved with labels: Update waits for a change, with no note on labels', () => {
		mockSearchParams = new URLSearchParams('report=r2');
		render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(true);
		for (const note of ['LABELS_NOT_KEPT', 'LABELS_CHECKING', 'LABELS_CHECK_FAILED']) {
			expect(screen.queryByText(`dashboard.savedReports.${note}`)).toBeNull();
		}
	});

	it.each([
		['checking', 'dashboard.savedReports.LABELS_CHECKING'],
		['not-kept', 'dashboard.savedReports.LABELS_NOT_KEPT']
	] as const)('saves no label view while Gauzy is %s, and says so', (support, note) => {
		mockLabelsSupport = support;
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

		expect(screen.queryAllByLabelText('dashboard.savedReports.NAME')).toHaveLength(0);
		expect(screen.getAllByText(note)).toHaveLength(2);
	});

	it('offers Try again as an item of the Saved reports menu when Update waits for a check that failed', () => {
		mockLabelsSupport = 'failed';
		mockSearchParams = new URLSearchParams('report=r2');
		render(<TimeActivitySavedReports report={labelViewProps(NO_FILTERS, 'date')} />);

		const retries = screen.getAllByText('dashboard.savedReports.TRY_AGAIN');
		const menuRetry = retries.find((retry) => retry.closest('button')?.getAttribute('data-menu-item') === 'true');
		expect(menuRetry).toBeTruthy();
		fireEvent.click(menuRetry as HTMLElement);
		expect(mockLabelsSupportRetry).toHaveBeenCalledTimes(1);
	});

	it('offers Save and Update as soon as Gauzy answers that it keeps labels', () => {
		mockLabelsSupport = 'checking';
		mockSearchParams = new URLSearchParams('report=r1');
		const { rerender } = render(
			<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />
		);
		expect(screen.queryAllByLabelText('dashboard.savedReports.NAME')).toHaveLength(0);
		expect(screen.getAllByText('dashboard.savedReports.LABELS_CHECKING').length).toBeGreaterThan(0);
		const pendingUpdate = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(pendingUpdate.disabled).toBe(true);

		mockLabelsSupport = 'kept';
		rerender(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

		expect(screen.queryByText('dashboard.savedReports.LABELS_CHECKING')).toBeNull();
		expect(screen.getAllByLabelText('dashboard.savedReports.NAME').length).toBeGreaterThan(0);
		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(false);
	});

	it('says Gauzy could not be asked, and asks again on Try again', () => {
		mockLabelsSupport = 'failed';
		mockSaved = { reports: [], availability: 'ready', linkTokens: {} };
		render(<TimeActivitySavedReports report={labelViewProps(DESIGN_WITHOUT_LABEL, 'label')} />);

		expect(screen.queryAllByLabelText('dashboard.savedReports.NAME')).toHaveLength(0);
		expect(screen.queryByText('dashboard.savedReports.LABELS_NOT_KEPT')).toBeNull();
		expect(screen.getAllByText('dashboard.savedReports.LABELS_CHECK_FAILED')).toHaveLength(2);
		fireEvent.click(screen.getAllByText('dashboard.savedReports.TRY_AGAIN')[0]);
		expect(mockLabelsSupportRetry).toHaveBeenCalledTimes(1);
	});

	it('names the report the view was opened from as the link the view is read from, a change pending included', () => {
		// The address still names r1 while the view, read from the link the page asked for, already shows r2
		const asked = new URLSearchParams('period=lastMonth&entryLabels=design%2Cno-label&groupBy=label&report=r2');
		const props = labelViewProps(DESIGN_WITHOUT_LABEL, 'label') as unknown as {
			settings: { linkParams: URLSearchParams };
		};
		mockSearchParams = new URLSearchParams('report=r1');
		props.settings.linkParams = asked;
		render(<TimeActivitySavedReports report={props as never} />);

		// r2 keeps this very view: nothing to update, and r1 is never written with r2's view
		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(true);
		fireEvent.click(update);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('writes no view over a report saved with labels while Gauzy is not known to keep them', () => {
		mockLabelsSupport = 'checking';
		mockSearchParams = new URLSearchParams('report=r2');
		// The page shows no labels yet: it drops those of the link until it knows whether entries have labels
		render(<TimeActivitySavedReports report={labelViewProps(NO_FILTERS, 'date')} />);

		const update = screen.getByText('dashboard.savedReports.UPDATE').closest('button') as HTMLButtonElement;
		expect(update.disabled).toBe(true);
		fireEvent.click(update);
		expect(mockUpdate).not.toHaveBeenCalled();
	});
});
