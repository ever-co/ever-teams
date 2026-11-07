/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AsanaIntegrationSettings, AsanaLookup } from '@/core/hooks/integrations/use-asana-integration';
import type { LinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import type { IAsanaProject, IAsanaSection } from '@/core/types/interfaces/integrations/asana';
import { AsanaProviderSection } from './asana-provider';

const mockProjects = jest.fn<AsanaLookup<IAsanaProject>, [string | null, string | null]>();
const mockSections = jest.fn<AsanaLookup<IAsanaSection>, [string | null, string | null]>();
const mockStatusOptions = jest.fn<LinearStatusOptions, [string | null]>();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/integrations/use-asana-integration', () => ({
	useAsanaProjects: (integrationId: string | null, workspaceGid: string | null) => mockProjects(integrationId, workspaceGid),
	useAsanaSections: (integrationId: string | null, projectGid: string | null) => mockSections(integrationId, projectGid)
}));
jest.mock('@/core/hooks/integrations/use-linear-integration', () => ({
	useLinearStatusOptions: (projectId: string | null) => mockStatusOptions(projectId)
}));
jest.mock('@/core/components/common/animated-height', () => ({
	AnimatedHeight: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
// A select whose items are buttons: a click picks the value, as the real one does.
jest.mock('@/core/components/common/select', () => {
	const ReactModule = jest.requireActual<typeof React>('react');
	const Picker = ReactModule.createContext<(value: string) => void>(() => undefined);
	return {
		Select: ({ children, value, onValueChange, disabled }: { children: React.ReactNode; value?: string; onValueChange?: (next: string) => void; disabled?: boolean }) => (
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
jest.mock('@/core/components/settings/kit/danger', () => ({
	DangerRow: ({ actionLabel, onAction }: { actionLabel: string; onAction: () => void }) => (
		<button type="button" onClick={onAction}>
			{actionLabel}
		</button>
	),
	ConfirmDestructiveDialog: ({ open, title, error }: { open: boolean; title: string; error?: string | null }) =>
		open ? (
			<p data-testid="asana-disconnect-dialog">
				{title}
				{error ? ` | ${error}` : ''}
			</p>
		) : null
}));

const STATUSES: LinearStatusOptions = { options: [{ name: 'open' }, { name: 'in-progress' }, { name: 'completed' }], isLoading: false, error: null, retry: jest.fn() };
const lookup = <T,>(items: T[], overrides: Partial<AsanaLookup<T>> = {}): AsanaLookup<T> => ({ items, isLoading: false, error: null, retry: jest.fn(), ...overrides });
const ASANA_PROJECTS: IAsanaProject[] = [
	{ gid: 'ap-1', name: 'Roadmap', archived: false },
	{ gid: 'ap-2', name: 'Launch', archived: false }
];
const SECTIONS: IAsanaSection[] = [
	{ gid: 's-todo', name: 'To do' },
	{ gid: 's-doing', name: 'Doing' }
];

function settings(overrides: Partial<AsanaIntegrationSettings> = {}): AsanaIntegrationSettings {
	return {
		status: 'notConnected',
		readError: null,
		isRetrying: false,
		retry: jest.fn(),
		connection: null,
		integrationId: null,
		webhooks: true,
		callbackError: null,
		dismissCallbackError: jest.fn(),
		workspaces: [],
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
		createMapping: jest.fn().mockResolvedValue(undefined),
		updateMapping: jest.fn().mockResolvedValue(undefined),
		removeMapping: jest.fn().mockResolvedValue(undefined),
		registerWebhook: jest.fn().mockResolvedValue(undefined),
		importNow: jest.fn().mockResolvedValue(undefined),
		...overrides
	};
}

function connected(overrides: Partial<AsanaIntegrationSettings> = {}): AsanaIntegrationSettings {
	return settings({
		status: 'connected',
		connection: { id: 'int-1', organizationId: 'org-1', asanaUserName: 'Ada', asanaUserEmail: 'ada@example.com', attentionReason: null, createdAt: '2026-11-07T00:00:00.000Z' } as never,
		integrationId: 'int-1',
		workspaces: [{ gid: 'w-1', name: 'Acme' }],
		projects: [{ id: 'p1', name: 'API' }],
		mappings: [{ id: 'm1', integrationId: 'int-1', asanaWorkspaceGid: 'w-1', asanaProjectGid: 'ap-1', asanaProjectName: 'Roadmap', projectId: 'p1', direction: 'inbound', sectionMap: { 's-doing': 'in-progress' }, syncEnabled: true, hasWebhook: false, lastImportedAt: null, lastCursor: null, lastError: null }],
		runs: [{ id: 'r1', mappingId: 'm1', kind: 'import', status: 'done', full: false, startedAt: '2026-11-07T01:00:00.000Z', finishedAt: null, createdCount: 3, updatedCount: 1, skippedCount: 0, failedCount: 0, lastError: null }],
		...overrides
	});
}

const pickIn = (container: HTMLElement, value: string) => fireEvent.click(container.querySelector(`[data-option="${value}"]`) as HTMLElement);

beforeEach(() => {
	mockProjects.mockReset().mockImplementation((_integrationId, workspaceGid) => lookup(workspaceGid ? ASANA_PROJECTS : []));
	mockSections.mockReset().mockImplementation((_integrationId, projectGid) => lookup(projectGid ? SECTIONS : []));
	mockStatusOptions.mockReset().mockReturnValue(STATUSES);
});

describe('AsanaProviderSection', () => {
	it('renders nothing while hidden (flag off, or the platform does not serve Asana)', () => {
		const { container } = render(<AsanaProviderSection asana={settings({ status: 'hidden' })} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('not connected: offers Connect, which starts the flow', () => {
		const asana = settings();
		render(<AsanaProviderSection asana={asana} />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.asana.CONNECT' }));
		expect(asana.connect).toHaveBeenCalledTimes(1);
	});

	it('connected: lists the mappings with their actions and webhook, the add form, the runs, and a way to disconnect', () => {
		const asana = connected();
		render(<AsanaProviderSection asana={asana} />);
		const row = screen.getByTestId('asana-mapping-m1');
		expect(row).toHaveTextContent('Roadmap');
		expect(row).toHaveTextContent('SECTIONS_MAPPED {"count":1}');
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.asana.IMPORT_CHANGES' }));
		expect(asana.importNow).toHaveBeenCalledWith('m1', false);
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.asana.WEBHOOK_REGISTER' }));
		expect(asana.registerWebhook).toHaveBeenCalledWith('m1');
		expect(screen.getByText('settings.integrations.asana.RUN_import')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.asana.DISCONNECT' }));
		expect(screen.getByTestId('asana-disconnect-dialog')).toHaveTextContent('settings.integrations.asana.DISCONNECT_TITLE');
	});

	it('add form: one workspace is chosen at once; its unmapped projects, the sections of the chosen one, and the map are saved', async () => {
		const asana = connected();
		render(<AsanaProviderSection asana={asana} />);
		const form = screen.getByTestId('asana-add-mapping');
		expect(mockProjects).toHaveBeenLastCalledWith('int-1', 'w-1');
		// Roadmap is mapped already: only Launch is offered.
		expect(form.querySelector('[data-option="ap-1"]')).toBeNull();
		pickIn(form, 'ap-2');
		expect(mockSections).toHaveBeenLastCalledWith('int-1', 'ap-2');
		pickIn(form, 'p1');
		expect(mockStatusOptions).toHaveBeenLastCalledWith('p1');
		pickIn(within(form).getByTestId('asana-section-s-doing'), 'in-progress');
		const save = screen.getByTestId('asana-add-mapping-save');
		expect(save).toBeEnabled();
		fireEvent.click(save);
		await waitFor(() => expect(asana.createMapping).toHaveBeenCalledTimes(1));
		expect(asana.createMapping).toHaveBeenCalledWith(
			expect.objectContaining({ asanaWorkspaceGid: 'w-1', asanaProjectGid: 'ap-2', asanaProjectName: 'Launch', projectId: 'p1', sectionMap: { 's-doing': 'in-progress' } })
		);
	});

	it('add form: a section status that is no status of the project or the organization blocks saving and is named', () => {
		mockStatusOptions.mockReturnValue({ ...STATUSES, options: [{ name: 'open' }] });
		render(<AsanaProviderSection asana={connected()} />);
		const form = screen.getByTestId('asana-add-mapping');
		pickIn(form, 'ap-2');
		pickIn(form, 'p1');
		pickIn(within(form).getByTestId('asana-section-s-todo'), 'open');
		expect(screen.getByTestId('asana-add-mapping-save')).toBeEnabled();
		// The person's earlier choice no longer names a status (the project's statuses changed).
		mockStatusOptions.mockReturnValue({ ...STATUSES, options: [{ name: 'completed' }] });
		pickIn(within(form).getByTestId('asana-section-s-doing'), 'completed');
		expect(within(form).getByRole('alert')).toHaveTextContent('SECTION_MAP_INVALID {"values":"open"}');
		expect(screen.getByTestId('asana-add-mapping-save')).toBeDisabled();
	});

	it('an existing mapping: the section map can be edited against the project sections and saved', async () => {
		const asana = connected();
		render(<AsanaProviderSection asana={asana} />);
		const row = screen.getByTestId('asana-mapping-m1');
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.asana.SECTION_MAP_EDIT' }));
		expect(mockSections).toHaveBeenLastCalledWith('int-1', 'ap-1');
		expect(within(row).getByTestId('asana-section-s-doing').querySelector('[data-testid="select"]')).toHaveAttribute('data-value', 'in-progress');
		pickIn(within(row).getByTestId('asana-section-s-todo'), 'open');
		const save = screen.getByTestId('asana-section-map-save-m1');
		expect(save).toBeEnabled();
		fireEvent.click(save);
		await waitFor(() => expect(asana.updateMapping).toHaveBeenCalledTimes(1));
		expect(asana.updateMapping).toHaveBeenCalledWith('m1', { sectionMap: { 's-todo': 'open', 's-doing': 'in-progress' } });
		await waitFor(() => expect(screen.queryByTestId('asana-section-map-save-m1')).not.toBeInTheDocument());
	});

	it('a failed mappings read hides the add form (every project would look unmapped) until the retry succeeds', () => {
		render(<AsanaProviderSection asana={connected({ mappings: [], canManageMappings: false, detailsError: new Error('down') })} />);
		expect(screen.queryByTestId('asana-add-mapping')).toBeNull();
		expect(screen.getByText('settings.integrations.asana.DETAILS_ERROR_TITLE')).toBeInTheDocument();
	});

	it('webhooks off on the platform: no webhook column, and the facts say so', () => {
		render(<AsanaProviderSection asana={connected({ webhooks: false })} />);
		expect(screen.queryByRole('button', { name: 'settings.integrations.asana.WEBHOOK_REGISTER' })).toBeNull();
		expect(screen.getByText('settings.integrations.asana.WEBHOOKS_OFF')).toBeInTheDocument();
	});

	it('shows what the platform sent the person back with, and lets them dismiss it', () => {
		const asana = settings({ callbackError: 'user_unreadable' });
		render(<AsanaProviderSection asana={asana} />);
		expect(screen.getByText('settings.integrations.asana.CALLBACK_user_unreadable')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));
		expect(asana.dismissCallbackError).toHaveBeenCalledTimes(1);
	});

	it('the disconnect confirmation shows only a disconnect error, never a mapping one', () => {
		const asana = connected({ actionError: new Error('mapping failed') });
		const { rerender } = render(<AsanaProviderSection asana={asana} />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.asana.DISCONNECT' }));
		expect(screen.getByTestId('asana-disconnect-dialog')).toHaveTextContent(/^settings\.integrations\.asana\.DISCONNECT_TITLE$/);
		rerender(<AsanaProviderSection asana={{ ...asana, disconnectError: new Error('disconnect failed') }} />);
		expect(screen.getByTestId('asana-disconnect-dialog').textContent).toMatch(/DISCONNECT_TITLE \| /);
	});
});
