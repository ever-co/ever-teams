/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type {
	JiraIntegrationSettings,
	JiraLookup,
	JiraProjectDetailLookup
} from '@/core/hooks/integrations/use-jira-integration';
import type { LinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import type { IJiraProject, IJiraProjectDetail, IJiraSite } from '@/core/types/interfaces/integrations/jira';
import { JiraProviderSection } from './jira-provider';

const mockSites = jest.fn<JiraLookup<IJiraSite>, [string | null]>();
const mockProjects = jest.fn<JiraLookup<IJiraProject>, [string | null, string | null]>();
const mockDetail = jest.fn<JiraProjectDetailLookup, [string | null, string | null, string | null]>();
const mockStatusOptions = jest.fn<LinearStatusOptions, [string | null]>();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/integrations/use-jira-integration', () => ({
	useJiraSites: (integrationId: string | null) => mockSites(integrationId),
	useJiraProjects: (integrationId: string | null, cloudId: string | null) => mockProjects(integrationId, cloudId),
	useJiraProjectDetail: (integrationId: string | null, cloudId: string | null, jiraProjectId: string | null) =>
		mockDetail(integrationId, cloudId, jiraProjectId)
}));
jest.mock('@/core/hooks/integrations/use-linear-integration', () => ({
	useLinearStatusOptions: (projectId: string | null) => mockStatusOptions(projectId)
}));
jest.mock('@/core/components/common/animated-height', () => ({
	AnimatedHeight: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
// A checkbox that is a plain one: a click turns it on or off, as the real one does.
jest.mock('@/core/components/common/checkbox', () => ({
	Checkbox: ({
		checked,
		onCheckedChange,
		disabled,
		'aria-label': label
	}: {
		checked?: boolean;
		onCheckedChange?: (next: boolean) => void;
		disabled?: boolean;
		'aria-label'?: string;
	}) => (
		<input
			type="checkbox"
			aria-label={label}
			checked={!!checked}
			disabled={disabled}
			onChange={(event) => onCheckedChange?.(event.target.checked)}
		/>
	)
}));
// A select whose items are buttons: a click picks the value, as the real one does.
jest.mock('@/core/components/common/select', () => {
	const ReactModule = jest.requireActual<typeof React>('react');
	const Picker = ReactModule.createContext<(value: string) => void>(() => undefined);
	return {
		Select: ({
			children,
			value,
			onValueChange,
			disabled
		}: {
			children: React.ReactNode;
			value?: string;
			onValueChange?: (next: string) => void;
			disabled?: boolean;
		}) => (
			<Picker.Provider value={onValueChange ?? (() => undefined)}>
				<div data-testid="select" data-value={value ?? ''} data-disabled={disabled ? 'true' : 'false'}>
					{children}
				</div>
			</Picker.Provider>
		),
		SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? ''}</span>,
		SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
			const pick = ReactModule.useContext(Picker);
			return (
				<button type="button" data-option={value} onClick={() => pick(value)}>
					{children}
				</button>
			);
		}
	};
});
// The conflict list reads its own data (its own tests cover it): here, only what the section hands it.
jest.mock('./integration-conflicts-row', () => ({
	IntegrationConflictsRow: ({
		provider,
		providerName,
		integrationId,
		runId,
		onClearRun
	}: {
		provider: string;
		providerName: string;
		integrationId: string;
		runId: string | null;
		onClearRun: () => void;
	}) => (
		<div
			data-testid="conflicts-row"
			data-provider={provider}
			data-integration={integrationId}
			data-run={runId ?? ''}
		>
			{providerName}
			<button type="button" onClick={onClearRun}>
				clear-run
			</button>
		</div>
	)
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	DangerRow: ({ actionLabel, onAction }: { actionLabel: string; onAction: () => void }) => (
		<button type="button" onClick={onAction}>
			{actionLabel}
		</button>
	),
	ConfirmDestructiveDialog: ({ open, title, error }: { open: boolean; title: string; error?: string | null }) =>
		open ? (
			<p data-testid="jira-disconnect-dialog">
				{title}
				{error ? ` | ${error}` : ''}
			</p>
		) : null
}));

const K = 'settings.integrations.jira';
const STATUSES: LinearStatusOptions = {
	options: [{ name: 'open' }, { name: 'in-progress' }, { name: 'completed' }],
	isLoading: false,
	error: null,
	retry: jest.fn()
};
const lookup = <T,>(items: T[], overrides: Partial<JiraLookup<T>> = {}): JiraLookup<T> => ({
	items,
	isLoading: false,
	error: null,
	retry: jest.fn(),
	...overrides
});
const JIRA_PROJECTS: IJiraProject[] = [
	{ id: '10000', key: 'RM', name: 'Roadmap' },
	{ id: '10001', key: 'LA', name: 'Launch' }
];
const DETAIL: IJiraProjectDetail = {
	project: JIRA_PROJECTS[1],
	issueTypes: [
		{ id: '10002', name: 'Story', subtask: false },
		{ id: '10003', name: 'Bug', subtask: false }
	],
	statuses: [
		{ id: '1', name: 'To Do', statusCategory: { key: 'new' } },
		{ id: '3', name: 'In Review', statusCategory: { key: 'indeterminate' } }
	]
};
const SITES: IJiraSite[] = [
	{ id: 'cloud-1', name: 'Acme', url: 'https://acme.atlassian.net', selected: false },
	{ id: 'cloud-2', name: 'Beta', url: 'https://beta.atlassian.net', selected: false }
];
const detailOf = (jiraProjectId: string | null): JiraProjectDetailLookup => ({
	detail: jiraProjectId ? DETAIL : null,
	isLoading: false,
	error: null,
	retry: jest.fn()
});

function settings(overrides: Partial<JiraIntegrationSettings> = {}): JiraIntegrationSettings {
	return {
		status: 'notConnected',
		readError: null,
		isRetrying: false,
		retry: jest.fn(),
		connection: null,
		integrationId: null,
		webhooks: true,
		defaultStatusMap: { new: 'open', indeterminate: 'in-progress', done: 'completed' },
		callbackError: null,
		dismissCallbackError: jest.fn(),
		projects: [],
		mappings: [],
		canManageMappings: true,
		runs: [],
		isLoadingDetails: false,
		detailsError: null,
		isRetryingDetails: false,
		retryDetails: jest.fn(),
		actionError: null,
		clearActionError: jest.fn(),
		disconnectError: null,
		clearDisconnectError: jest.fn(),
		pending: { kind: null, mappingId: null },
		connect: jest.fn(),
		disconnect: jest.fn().mockResolvedValue(undefined),
		selectSite: jest.fn().mockResolvedValue(undefined),
		createMapping: jest.fn().mockResolvedValue(undefined),
		updateMapping: jest.fn().mockResolvedValue(undefined),
		removeMapping: jest.fn().mockResolvedValue(undefined),
		registerWebhook: jest.fn().mockResolvedValue(undefined),
		importNow: jest.fn().mockResolvedValue(undefined),
		...overrides
	};
}

const CONNECTION = {
	id: 'int-1',
	organizationId: 'org-1',
	cloudId: 'cloud-1',
	siteUrl: 'https://acme.atlassian.net',
	siteName: 'Acme',
	accountId: 'acc-1',
	accountName: 'Ada',
	siteRequired: false,
	webhookExpiresAt: null,
	webhookError: null,
	connectedByUserId: null,
	attentionReason: null,
	tokenExpiresAt: null,
	lastSyncedAt: null,
	createdAt: '2026-11-07T00:00:00.000Z'
};

function connected(overrides: Partial<JiraIntegrationSettings> = {}): JiraIntegrationSettings {
	return settings({
		status: 'connected',
		connection: { ...CONNECTION },
		integrationId: 'int-1',
		projects: [{ id: 'p1', name: 'API' }],
		mappings: [
			{
				id: 'm1',
				integrationId: 'int-1',
				jiraProjectId: '10000',
				jiraProjectKey: 'RM',
				jiraProjectName: 'Roadmap',
				projectId: 'p1',
				direction: 'inbound',
				statusMap: { new: 'open', indeterminate: 'in-progress', done: 'completed', 'status:3': 'in-progress' },
				issueTypeIds: [],
				syncEnabled: true,
				lastImportedAt: null,
				lastCursor: null,
				lastError: null
			}
		],
		runs: [
			{
				id: 'r1',
				mappingId: 'm1',
				kind: 'import',
				status: 'done',
				full: false,
				startedAt: '2026-11-07T01:00:00.000Z',
				finishedAt: null,
				createdCount: 3,
				updatedCount: 1,
				skippedCount: 0,
				failedCount: 2,
				lastError: null,
				report: {
					startedFrom: null,
					stoppedAt: null,
					complete: true,
					pages: 1,
					issuesRead: 6,
					comments: 4,
					links: 1,
					relations: 0,
					conflicts: 0,
					failures: [{ key: 'RM-7', error: 'x' }],
					moreFailures: 1
				}
			}
		],
		...overrides
	});
}

const pickIn = (container: HTMLElement, value: string) =>
	fireEvent.click(container.querySelector(`[data-option="${value}"]`) as HTMLElement);

beforeEach(() => {
	mockSites.mockReset().mockImplementation((integrationId) => lookup(integrationId ? SITES : []));
	mockProjects.mockReset().mockImplementation((_integrationId, cloudId) => lookup(cloudId ? JIRA_PROJECTS : []));
	mockDetail.mockReset().mockImplementation((_integrationId, _cloudId, jiraProjectId) => detailOf(jiraProjectId));
	mockStatusOptions.mockReset().mockReturnValue(STATUSES);
});

// The sections render through hooks that read `window.matchMedia`, which jsdom does not provide.
beforeAll(() => {
	window.matchMedia = jest.fn().mockReturnValue({
		matches: false,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		addListener: jest.fn(),
		removeListener: jest.fn()
	}) as unknown as typeof window.matchMedia;
});

describe('JiraProviderSection', () => {
	it('renders nothing while hidden (flag off, or the platform does not serve Jira)', () => {
		const { container } = render(<JiraProviderSection jira={settings({ status: 'hidden' })} />);
		expect(container.innerHTML).toBe('');
	});

	it('not connected: offers Connect, which starts the flow', () => {
		const jira = settings();
		render(<JiraProviderSection jira={jira} />);
		fireEvent.click(screen.getByRole('button', { name: `${K}.CONNECT` }));
		expect(jira.connect).toHaveBeenCalledTimes(1);
	});

	it('a connection waiting for its site: only the site choice (and disconnect), and the chosen site is saved', async () => {
		const jira = connected({
			connection: { ...CONNECTION, cloudId: null, siteName: null, siteUrl: null, siteRequired: true }
		});
		render(<JiraProviderSection jira={jira} />);
		expect(screen.getByText(`${K}.STATE_SITE_REQUIRED`)).toBeTruthy();
		expect(screen.queryByTestId('jira-mapping-m1')).toBeNull();
		expect(screen.queryByTestId('jira-add-mapping')).toBeNull();
		const choice = screen.getByTestId('jira-site-choice');
		expect(choice.textContent).toContain(`${K}.SITE_REQUIRED`);
		expect((screen.getByTestId('jira-site-save') as HTMLButtonElement).disabled).toBe(true);
		pickIn(choice, 'cloud-2');
		fireEvent.click(screen.getByTestId('jira-site-save'));
		await waitFor(() => expect(jira.selectSite).toHaveBeenCalledWith('cloud-2'));
		expect(screen.getByRole('button', { name: `${K}.DISCONNECT` })).toBeTruthy();
	});

	it('connected: the site can be changed to another one the token reaches', async () => {
		const jira = connected();
		render(<JiraProviderSection jira={jira} />);
		fireEvent.click(screen.getByTestId('jira-site-change'));
		const choice = screen.getByTestId('jira-site-choice');
		expect(choice.textContent).toContain(`${K}.SITE_CHANGE_HINT`);
		// The current site is no change.
		expect((screen.getByTestId('jira-site-save') as HTMLButtonElement).disabled).toBe(true);
		pickIn(choice, 'cloud-2');
		fireEvent.click(screen.getByTestId('jira-site-save'));
		await waitFor(() => expect(jira.selectSite).toHaveBeenCalledWith('cloud-2'));
		await waitFor(() => expect(screen.queryByTestId('jira-site-choice')).toBeNull());
	});

	it('connected: lists the mappings with their actions, the add form, the runs with their reports, and a way to disconnect', () => {
		const jira = connected();
		render(<JiraProviderSection jira={jira} />);
		const row = screen.getByTestId('jira-mapping-m1');
		expect(row.textContent).toContain('Roadmap (RM)');
		expect(row.textContent).toContain('STATUSES_MAPPED {"count":1}');
		fireEvent.click(within(row).getByRole('button', { name: `${K}.IMPORT_CHANGES` }));
		expect(jira.importNow).toHaveBeenCalledWith('m1', false);
		fireEvent.click(within(row).getByRole('button', { name: `${K}.IMPORT_ALL` }));
		expect(jira.importNow).toHaveBeenCalledWith('m1', true);
		expect(screen.getByText(`${K}.RUN_import`)).toBeTruthy();
		const report = screen.getByTestId('jira-run-report-r1');
		expect(report.textContent).toContain('RUN_REPORT {"issues":6,"comments":4,"links":1}');
		expect(report.textContent).toContain('RUN_FAILURES {"keys":"RM-7"}');
		expect(report.textContent).toContain('RUN_FAILURES_MORE {"count":1}');
		fireEvent.click(screen.getByRole('button', { name: `${K}.DISCONNECT` }));
		expect(screen.getByTestId('jira-disconnect-dialog').textContent).toContain(`${K}.DISCONNECT_TITLE`);
	});

	it('add form: the unmapped projects of the site, the chosen one statuses and issue types, and the map are saved', async () => {
		const jira = connected();
		render(<JiraProviderSection jira={jira} />);
		const form = screen.getByTestId('jira-add-mapping');
		expect(mockProjects).toHaveBeenLastCalledWith('int-1', 'cloud-1');
		// Roadmap is mapped already: only Launch is offered.
		expect(form.querySelector('[data-option="10000"]')).toBeNull();
		pickIn(form, '10001');
		expect(mockDetail).toHaveBeenLastCalledWith('int-1', 'cloud-1', '10001');
		pickIn(form, 'p1');
		expect(mockStatusOptions).toHaveBeenLastCalledWith('p1');
		pickIn(within(form).getByTestId('jira-status-3'), 'completed');
		fireEvent.click(within(form).getByRole('checkbox', { name: 'Story' }));
		const save = screen.getByTestId('jira-add-mapping-save');
		expect((save as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(save);
		await waitFor(() => expect(jira.createMapping).toHaveBeenCalledTimes(1));
		expect(jira.createMapping).toHaveBeenCalledWith({
			jiraProjectId: '10001',
			jiraProjectKey: 'LA',
			jiraProjectName: 'Launch',
			projectId: 'p1',
			direction: 'inbound',
			statusMap: { new: 'open', indeterminate: 'in-progress', done: 'completed', 'status:3': 'completed' },
			issueTypeIds: ['10002'],
			syncEnabled: true
		});
	});

	it('add form: a category or status value that is no status of the project or the organization blocks saving and is named', () => {
		mockStatusOptions.mockReturnValue({ ...STATUSES, options: [{ name: 'open' }, { name: 'completed' }] });
		const jira = connected();
		render(<JiraProviderSection jira={jira} />);
		const form = screen.getByTestId('jira-add-mapping');
		pickIn(form, '10001');
		pickIn(form, 'p1');
		// The default for "in progress" is no status here.
		expect(within(form).getByRole('alert').textContent).toContain('STATUS_MAP_INVALID {"values":"in-progress"}');
		expect((screen.getByTestId('jira-add-mapping-save') as HTMLButtonElement).disabled).toBe(true);
		pickIn(within(form).getByTestId('jira-category-indeterminate'), 'open');
		expect(within(form).queryByRole('alert')).toBeNull();
		expect((screen.getByTestId('jira-add-mapping-save') as HTMLButtonElement).disabled).toBe(false);
	});

	it('another site starts the forms afresh: no project, status or issue type chosen for the former one is kept', () => {
		const jira = connected();
		const { rerender } = render(<JiraProviderSection jira={jira} />);
		const form = screen.getByTestId('jira-add-mapping');
		pickIn(form, '10001');
		pickIn(form, 'p1');
		fireEvent.click(within(form).getByRole('checkbox', { name: 'Story' }));
		expect((screen.getByTestId('jira-add-mapping-save') as HTMLButtonElement).disabled).toBe(false);
		const row = screen.getByTestId('jira-mapping-m1');
		fireEvent.click(within(row).getByRole('button', { name: `${K}.STATUS_MAP_EDIT` }));
		expect(screen.getByTestId('jira-status-map-save-m1')).toBeTruthy();

		rerender(<JiraProviderSection jira={{ ...jira, connection: { ...CONNECTION, cloudId: 'cloud-2' } }} />);
		expect(mockProjects).toHaveBeenLastCalledWith('int-1', 'cloud-2');
		const fresh = screen.getByTestId('jira-add-mapping');
		expect(fresh.querySelector('[data-testid="jira-status-map"]')).toBeNull();
		expect((screen.getByTestId('jira-add-mapping-save') as HTMLButtonElement).disabled).toBe(true);
		expect(screen.queryByTestId('jira-status-map-save-m1')).toBeNull();
	});

	it('add form: saving waits for the project statuses and issue types', () => {
		mockDetail.mockImplementation((_integrationId, _cloudId, jiraProjectId) => ({
			...detailOf(jiraProjectId),
			detail: null,
			isLoading: !!jiraProjectId
		}));
		render(<JiraProviderSection jira={connected()} />);
		const form = screen.getByTestId('jira-add-mapping');
		pickIn(form, '10001');
		pickIn(form, 'p1');
		expect(form.textContent).toContain(`${K}.PROJECT_LOADING`);
		expect((screen.getByTestId('jira-add-mapping-save') as HTMLButtonElement).disabled).toBe(true);
	});

	it('an existing mapping: the status map and issue types can be edited against the project and saved', async () => {
		const jira = connected();
		render(<JiraProviderSection jira={jira} />);
		const row = screen.getByTestId('jira-mapping-m1');
		fireEvent.click(within(row).getByRole('button', { name: `${K}.STATUS_MAP_EDIT` }));
		expect(mockDetail).toHaveBeenCalledWith('int-1', 'cloud-1', '10000');
		expect(
			within(row).getByTestId('jira-status-3').querySelector('[data-testid="select"]')?.getAttribute('data-value')
		).toBe('in-progress');
		pickIn(within(row).getByTestId('jira-category-done'), 'open');
		fireEvent.click(within(row).getByRole('checkbox', { name: 'Bug' }));
		const save = screen.getByTestId('jira-status-map-save-m1');
		expect((save as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(save);
		await waitFor(() => expect(jira.updateMapping).toHaveBeenCalledTimes(1));
		expect(jira.updateMapping).toHaveBeenCalledWith('m1', {
			statusMap: { new: 'open', indeterminate: 'in-progress', done: 'open', 'status:3': 'in-progress' },
			issueTypeIds: ['10003']
		});
		await waitFor(() => expect(screen.queryByTestId('jira-status-map-save-m1')).toBeNull());
	});

	it('the webhook: a failed registration is named and can be retried; off on the platform, no webhook row', () => {
		const jira = connected({ connection: { ...CONNECTION, webhookError: 'Forbidden' } });
		const { rerender } = render(<JiraProviderSection jira={jira} />);
		const row = screen.getByTestId('jira-webhook');
		expect(row.textContent).toContain('WEBHOOK_FAILED {"reason":"Forbidden"}');
		fireEvent.click(within(row).getByRole('button', { name: `${K}.WEBHOOK_REGISTER` }));
		expect(jira.registerWebhook).toHaveBeenCalledTimes(1);

		rerender(
			<JiraProviderSection
				jira={connected({ connection: { ...CONNECTION, webhookExpiresAt: '2026-12-07T00:00:00.000Z' } })}
			/>
		);
		expect(screen.getByTestId('jira-webhook').textContent).toContain(`${K}.WEBHOOK_ACTIVE`);
		expect(within(screen.getByTestId('jira-webhook')).queryByRole('button')).toBeNull();

		rerender(<JiraProviderSection jira={connected({ webhooks: false })} />);
		expect(screen.queryByTestId('jira-webhook')).toBeNull();
		expect(screen.getByText(`${K}.WEBHOOKS_OFF`)).toBeTruthy();
	});

	it('a failed mappings read hides the add form (every project would look unmapped) until the retry succeeds', () => {
		render(
			<JiraProviderSection
				jira={connected({ mappings: [], canManageMappings: false, detailsError: new Error('down') })}
			/>
		);
		expect(screen.queryByTestId('jira-add-mapping')).toBeNull();
		expect(screen.getByText(`${K}.DETAILS_ERROR_TITLE`)).toBeTruthy();
	});

	it('shows what the platform sent the person back with, and lets them dismiss it', () => {
		const jira = settings({ callbackError: 'no_site' });
		render(<JiraProviderSection jira={jira} />);
		expect(screen.getByText(`${K}.CALLBACK_no_site`)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));
		expect(jira.dismissCallbackError).toHaveBeenCalledTimes(1);
	});

	it("connected: the conflict list of the connection, and each run's conflict count opens that run's conflicts", () => {
		const base = connected().runs[0];
		render(
			<JiraProviderSection
				jira={connected({
					runs: [
						{ ...base, conflictCount: 2 },
						{ ...base, id: 'r2', conflictCount: 0 }
					]
				})}
			/>
		);
		const row = screen.getByTestId('conflicts-row');
		expect(row.getAttribute('data-provider')).toBe('jira');
		expect(row.getAttribute('data-integration')).toBe('int-1');
		expect(row.textContent).toContain(`${K}.TITLE`);
		const counts = screen.getAllByRole('button', { name: /settings\.integrations\.conflicts\.RUN_COUNT/ });
		expect(counts).toHaveLength(1);
		fireEvent.click(counts[0]);
		expect(screen.getByTestId('conflicts-row').getAttribute('data-run')).toBe('r1');
		fireEvent.click(screen.getByRole('button', { name: 'clear-run' }));
		expect(screen.getByTestId('conflicts-row').getAttribute('data-run')).toBe('');
	});
});
