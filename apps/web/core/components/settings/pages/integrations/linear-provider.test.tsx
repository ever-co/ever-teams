/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { LinearIntegrationSettings, LinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import { LinearProviderSection } from './linear-provider';

const mockStatusOptions = jest.fn<LinearStatusOptions, [string | null]>();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
	useLocale: () => 'en'
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
			<p data-testid="linear-disconnect-dialog">
				{title}
				{error ? ` | ${error}` : ''}
			</p>
		) : null
}));

const STATUSES: LinearStatusOptions = {
	options: [{ name: 'open' }, { name: 'backlog' }, { name: 'in-progress' }, { name: 'completed' }, { name: 'cancelled' }],
	isLoading: false,
	error: null,
	retry: jest.fn()
};

function settings(overrides: Partial<LinearIntegrationSettings> = {}): LinearIntegrationSettings {
	return {
		status: 'notConnected',
		readError: null,
		isRetrying: false,
		retry: jest.fn(),
		connection: null,
		defaultStateMap: {},
		callbackError: null,
		dismissCallbackError: jest.fn(),
		teams: [],
		projects: [],
		mappings: [],
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
		importNow: jest.fn().mockResolvedValue(undefined),
		...overrides
	};
}

function connected(overrides: Partial<LinearIntegrationSettings> = {}): LinearIntegrationSettings {
	return settings({
		status: 'connected',
		connection: { id: 'int-1', organizationId: 'org-1', linearOrganizationName: 'Acme', attentionReason: null, createdAt: '2026-11-07T00:00:00.000Z' } as never,
		teams: [
			{ id: 't1', key: 'ENG', name: 'Engineering' },
			{ id: 't2', key: 'OPS', name: 'Operations' }
		],
		projects: [{ id: 'p1', name: 'API' }],
		mappings: [{ id: 'm1', integrationId: 'int-1', linearTeamId: 't1', linearTeamKey: 'ENG', linearTeamName: 'Engineering', projectId: 'p1', direction: 'inbound', stateMap: {}, syncEnabled: true, lastImportedAt: null, lastCursor: null, lastError: null }],
		runs: [{ id: 'r1', mappingId: 'm1', kind: 'import', status: 'done', full: false, startedAt: '2026-11-07T01:00:00.000Z', finishedAt: null, createdCount: 3, updatedCount: 1, skippedCount: 0, failedCount: 0, lastError: null }],
		...overrides
	});
}

const pickIn = (container: HTMLElement, value: string) => fireEvent.click(container.querySelector(`[data-option="${value}"]`) as HTMLElement);

beforeEach(() => {
	mockStatusOptions.mockReset().mockReturnValue(STATUSES);
});

describe('LinearProviderSection', () => {
	it('renders nothing while hidden (flag off, or the platform does not serve Linear)', () => {
		const { container } = render(<LinearProviderSection linear={settings({ status: 'hidden' })} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('not connected: offers Connect, which starts the flow', () => {
		const linear = settings();
		render(<LinearProviderSection linear={linear} />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.linear.CONNECT' }));
		expect(linear.connect).toHaveBeenCalledTimes(1);
	});

	it('not configured on the platform: Connect is disabled and says why', () => {
		render(<LinearProviderSection linear={settings({ status: 'notConfigured' })} />);
		expect(screen.getByRole('button', { name: 'settings.integrations.linear.CONNECT' })).toBeDisabled();
		expect(screen.getByText('settings.integrations.linear.CONNECT_UNAVAILABLE')).toBeInTheDocument();
	});

	it('connected: lists the mappings with their actions, the add form, the runs, and a way to disconnect', () => {
		const linear = connected();
		render(<LinearProviderSection linear={linear} />);
		expect(screen.getByText('ENG · Engineering')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.linear.IMPORT_CHANGES' }));
		expect(linear.importNow).toHaveBeenCalledWith('m1', false);
		// The add form offers only the team not mapped yet.
		expect(screen.getByTestId('linear-add-mapping')).toHaveTextContent('OPS · Operations');
		expect(screen.getByTestId('linear-add-mapping')).not.toHaveTextContent('ENG · Engineering');
		expect(screen.getByText('settings.integrations.linear.RUN_import')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.linear.DISCONNECT' }));
		expect(screen.getByTestId('linear-disconnect-dialog')).toHaveTextContent('settings.integrations.linear.DISCONNECT_TITLE');
	});

	it('add form: the state map offers the statuses of the chosen project and the organization, and saves them', async () => {
		const linear = connected();
		render(<LinearProviderSection linear={linear} />);
		const form = screen.getByTestId('linear-add-mapping');
		pickIn(form, 't2');
		pickIn(form, 'p1');
		expect(mockStatusOptions).toHaveBeenLastCalledWith('p1');
		// The started kind: in-progress by default, changed to completed.
		const started = within(form).getByTestId('linear-state-started');
		expect(started.querySelector('[data-testid="select"]')).toHaveAttribute('data-value', 'in-progress');
		pickIn(started, 'completed');
		const save = screen.getByTestId('linear-add-mapping-save');
		expect(save).toBeEnabled();
		fireEvent.click(save);
		await waitFor(() => expect(linear.createMapping).toHaveBeenCalledTimes(1));
		expect(linear.createMapping).toHaveBeenCalledWith(
			expect.objectContaining({ linearTeamId: 't2', projectId: 'p1', stateMap: expect.objectContaining({ started: 'completed', triage: 'open', canceled: 'cancelled' }) })
		);
	});

	it('add form: a value that is no status of the project or the organization blocks saving and is named', () => {
		mockStatusOptions.mockReturnValue({ ...STATUSES, options: [{ name: 'open' }, { name: 'completed' }] });
		const linear = connected({ defaultStateMap: { started: 'doing' } });
		render(<LinearProviderSection linear={linear} />);
		const form = screen.getByTestId('linear-add-mapping');
		pickIn(form, 't2');
		pickIn(form, 'p1');
		expect(within(form).getByRole('alert')).toHaveTextContent('STATE_MAP_INVALID {"values":"backlog, doing, cancelled"}');
		expect(screen.getByTestId('linear-add-mapping-save')).toBeDisabled();
		// Each offending field offers its own value, marked, so the person sees what to replace.
		expect(within(within(form).getByTestId('linear-state-started')).getByRole('button', { name: 'settings.integrations.linear.STATE_MAP_UNKNOWN {"value":"doing"}' })).toBeInTheDocument();
	});

	it('add form: while the statuses cannot be read, nothing can be saved and a retry is offered', () => {
		const retry = jest.fn();
		mockStatusOptions.mockReturnValue({ options: [], isLoading: false, error: new Error('down'), retry });
		render(<LinearProviderSection linear={connected()} />);
		const form = screen.getByTestId('linear-add-mapping');
		pickIn(form, 't2');
		pickIn(form, 'p1');
		expect(screen.getByTestId('linear-add-mapping-save')).toBeDisabled();
		fireEvent.click(within(form).getByRole('button', { name: 'notifications.RETRY' }));
		expect(retry).toHaveBeenCalledTimes(1);
	});

	it('an existing mapping: a stored value that is no status is flagged, and the map can be corrected', async () => {
		const linear = connected({ mappings: [{ ...connected().mappings[0], stateMap: { started: 'doing' } }] });
		render(<LinearProviderSection linear={linear} />);
		const row = screen.getByTestId('linear-mapping-m1');
		expect(within(row).getByRole('alert')).toHaveTextContent('STATE_MAP_INVALID {"values":"doing"}');
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.linear.STATE_MAP_EDIT' }));
		expect(mockStatusOptions).toHaveBeenCalledWith('p1');
		const save = screen.getByTestId('linear-state-map-save-m1');
		expect(save).toBeDisabled();
		pickIn(within(row).getByTestId('linear-state-started'), 'in-progress');
		expect(save).toBeEnabled();
		fireEvent.click(save);
		await waitFor(() => expect(linear.updateMapping).toHaveBeenCalledTimes(1));
		expect(linear.updateMapping).toHaveBeenCalledWith('m1', { stateMap: expect.objectContaining({ started: 'in-progress', completed: 'completed' }) });
		await waitFor(() => expect(screen.queryByTestId('linear-state-map-save-m1')).not.toBeInTheDocument());
	});

	it('shows what the platform sent the person back with, and lets them dismiss it', () => {
		const linear = settings({ callbackError: 'denied' });
		render(<LinearProviderSection linear={linear} />);
		expect(screen.getByText('settings.integrations.linear.CALLBACK_denied')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));
		expect(linear.dismissCallbackError).toHaveBeenCalledTimes(1);
	});

	it('the disconnect confirmation shows only a disconnect error, never a mapping one', () => {
		const linear = connected({ actionError: new Error('mapping failed') });
		const { rerender } = render(<LinearProviderSection linear={linear} />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.linear.DISCONNECT' }));
		expect(screen.getByTestId('linear-disconnect-dialog')).toHaveTextContent(/^settings\.integrations\.linear\.DISCONNECT_TITLE$/);
		rerender(<LinearProviderSection linear={{ ...linear, disconnectError: new Error('disconnect failed') }} />);
		expect(screen.getByTestId('linear-disconnect-dialog').textContent).toMatch(/DISCONNECT_TITLE \| /);
	});
});
