/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { LinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import type { TrelloIntegrationSettings, TrelloLookup } from '@/core/hooks/integrations/use-trello-integration';
import type { ITrelloList } from '@/core/types/interfaces/integrations/trello';
import { TrelloProviderSection } from './trello-provider';

const mockLists = jest.fn<TrelloLookup<ITrelloList>, [string | null, string | null]>();
const mockStatusOptions = jest.fn<LinearStatusOptions, [string | null]>();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/integrations/use-trello-integration', () => ({
	useTrelloLists: (integrationId: string | null, boardId: string | null) => mockLists(integrationId, boardId)
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
			<p data-testid="trello-disconnect-dialog">
				{title}
				{error ? ` | ${error}` : ''}
			</p>
		) : null
}));

const STATUSES: LinearStatusOptions = { options: [{ name: 'open' }, { name: 'in-progress' }, { name: 'completed' }], isLoading: false, error: null, retry: jest.fn() };
const lookup = <T,>(items: T[], overrides: Partial<TrelloLookup<T>> = {}): TrelloLookup<T> => ({ items, isLoading: false, error: null, retry: jest.fn(), ...overrides });
const LISTS: ITrelloList[] = [
	{ id: 'l-todo', name: 'To do', closed: false, pos: 1 },
	{ id: 'l-doing', name: 'Doing', closed: false, pos: 2 }
];

function settings(overrides: Partial<TrelloIntegrationSettings> = {}): TrelloIntegrationSettings {
	return {
		status: 'notConnected',
		readError: null,
		isRetrying: false,
		retry: jest.fn(),
		connection: null,
		integrationId: null,
		webhooks: true,
		isFinishing: false,
		finishError: null,
		returnRefused: false,
		clearReturnRefused: jest.fn(),
		clearFinishError: jest.fn(),
		boards: [],
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

function connected(overrides: Partial<TrelloIntegrationSettings> = {}): TrelloIntegrationSettings {
	return settings({
		status: 'connected',
		connection: { id: 'int-1', organizationId: 'org-1', trelloMemberName: 'Ada', trelloMemberUsername: 'ada', attentionReason: null, createdAt: '2026-11-07T00:00:00.000Z' } as never,
		integrationId: 'int-1',
		boards: [
			{ id: 'b-1', name: 'Roadmap', closed: false, idOrganization: null, url: null },
			{ id: 'b-2', name: 'Launch', closed: false, idOrganization: null, url: null }
		],
		projects: [{ id: 'p1', name: 'API' }],
		mappings: [{ id: 'm1', integrationId: 'int-1', trelloBoardId: 'b-1', trelloBoardName: 'Roadmap', projectId: 'p1', direction: 'inbound', listMap: { 'l-doing': 'in-progress' }, syncEnabled: true, hasWebhook: false, lastImportedAt: null, lastCursor: null, lastError: null }],
		runs: [{ id: 'r1', mappingId: 'm1', kind: 'import', status: 'done', full: false, startedAt: '2026-11-07T01:00:00.000Z', finishedAt: null, createdCount: 3, updatedCount: 1, skippedCount: 0, failedCount: 0, lastError: null }],
		...overrides
	});
}

const pickIn = (container: HTMLElement, value: string) => fireEvent.click(container.querySelector(`[data-option="${value}"]`) as HTMLElement);

beforeEach(() => {
	mockLists.mockReset().mockImplementation((_integrationId, boardId) => lookup(boardId ? LISTS : []));
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

describe('TrelloProviderSection', () => {
	it('renders nothing while hidden (flag off, or the platform does not serve Trello)', () => {
		const { container } = render(<TrelloProviderSection trello={settings({ status: 'hidden' })} />);
		expect((container).innerHTML).toBe('');
	});

	it('not connected: offers Connect, which starts the flow; while the return is finished the button waits', () => {
		const trello = settings();
		const { rerender } = render(<TrelloProviderSection trello={trello} />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.trello.CONNECT' }));
		expect(trello.connect).toHaveBeenCalledTimes(1);
		rerender(<TrelloProviderSection trello={settings({ pending: { kind: 'finish', mappingId: null } })} />);
		expect((screen.getByRole('button', { name: 'settings.integrations.trello.CONNECT' }) as HTMLButtonElement).disabled).toBe(true);
		expect(screen.getByText('settings.integrations.trello.FINISHING')).toBeTruthy();
	});

	it('a refused token on the return is said, and can be dismissed', () => {
		const trello = settings({ finishError: new Error('refused') });
		render(<TrelloProviderSection trello={trello} />);
		expect(screen.getByText('settings.integrations.trello.FINISH_ERROR_TITLE')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));
		expect(trello.clearFinishError).toHaveBeenCalledTimes(1);
	});

	it('connected: lists the mappings with their actions and webhook, the add form, the runs, and a way to disconnect', () => {
		const trello = connected();
		render(<TrelloProviderSection trello={trello} />);
		const row = screen.getByTestId('trello-mapping-m1');
		expect((row).textContent ?? '').toContain('Roadmap');
		expect((row).textContent ?? '').toContain('LISTS_MAPPED {"count":1}');
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.trello.IMPORT_CHANGES' }));
		expect(trello.importNow).toHaveBeenCalledWith('m1', false);
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.trello.WEBHOOK_REGISTER' }));
		expect(trello.registerWebhook).toHaveBeenCalledWith('m1');
		expect(screen.getByText('settings.integrations.trello.RUN_import')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.trello.DISCONNECT' }));
		expect((screen.getByTestId('trello-disconnect-dialog')).textContent ?? '').toContain('settings.integrations.trello.DISCONNECT_TITLE');
	});

	it('add form: offers the unmapped boards, reads the lists of the chosen one, and saves the map', async () => {
		const trello = connected();
		render(<TrelloProviderSection trello={trello} />);
		const form = screen.getByTestId('trello-add-mapping');
		// Roadmap is mapped already: only Launch is offered.
		expect(form.querySelector('[data-option="b-1"]')).toBeNull();
		pickIn(form, 'b-2');
		expect(mockLists).toHaveBeenLastCalledWith('int-1', 'b-2');
		pickIn(form, 'p1');
		expect(mockStatusOptions).toHaveBeenLastCalledWith('p1');
		pickIn(within(form).getByTestId('trello-list-l-doing'), 'in-progress');
		const save = screen.getByTestId('trello-add-mapping-save');
		expect((save as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(save);
		await waitFor(() => expect(trello.createMapping).toHaveBeenCalledTimes(1));
		expect(trello.createMapping).toHaveBeenCalledWith(expect.objectContaining({ trelloBoardId: 'b-2', trelloBoardName: 'Launch', projectId: 'p1', listMap: { 'l-doing': 'in-progress' } }));
	});

	it('add form: a list status that is no status of the project or the organization blocks saving and is named', () => {
		mockStatusOptions.mockReturnValue({ ...STATUSES, options: [{ name: 'open' }] });
		render(<TrelloProviderSection trello={connected()} />);
		const form = screen.getByTestId('trello-add-mapping');
		pickIn(form, 'b-2');
		pickIn(form, 'p1');
		pickIn(within(form).getByTestId('trello-list-l-todo'), 'open');
		expect((screen.getByTestId('trello-add-mapping-save') as HTMLButtonElement).disabled).toBe(false);
		mockStatusOptions.mockReturnValue({ ...STATUSES, options: [{ name: 'completed' }] });
		pickIn(within(form).getByTestId('trello-list-l-doing'), 'completed');
		expect((within(form).getByRole('alert')).textContent ?? '').toContain('LIST_MAP_INVALID {"values":"open"}');
		expect((screen.getByTestId('trello-add-mapping-save') as HTMLButtonElement).disabled).toBe(true);
	});

	it('an existing mapping: the list map can be edited against the board lists and saved', async () => {
		const trello = connected();
		render(<TrelloProviderSection trello={trello} />);
		const row = screen.getByTestId('trello-mapping-m1');
		fireEvent.click(within(row).getByRole('button', { name: 'settings.integrations.trello.LIST_MAP_EDIT' }));
		expect(mockLists).toHaveBeenLastCalledWith('int-1', 'b-1');
		expect((within(row).getByTestId('trello-list-l-doing').querySelector('[data-testid="select"]'))?.getAttribute('data-value')).toBe('in-progress');
		pickIn(within(row).getByTestId('trello-list-l-todo'), 'open');
		const save = screen.getByTestId('trello-list-map-save-m1');
		expect((save as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(save);
		await waitFor(() => expect(trello.updateMapping).toHaveBeenCalledTimes(1));
		expect(trello.updateMapping).toHaveBeenCalledWith('m1', { listMap: { 'l-todo': 'open', 'l-doing': 'in-progress' } });
		await waitFor(() => expect(screen.queryByTestId('trello-list-map-save-m1')).toBeNull());
	});

	it('a failed mappings read hides the add form until the retry succeeds; webhooks off hides the webhook column', () => {
		const { rerender } = render(<TrelloProviderSection trello={connected({ mappings: [], canManageMappings: false, detailsError: new Error('down') })} />);
		expect(screen.queryByTestId('trello-add-mapping')).toBeNull();
		expect(screen.getByText('settings.integrations.trello.DETAILS_ERROR_TITLE')).toBeTruthy();
		rerender(<TrelloProviderSection trello={connected({ webhooks: false })} />);
		expect(screen.queryByRole('button', { name: 'settings.integrations.trello.WEBHOOK_REGISTER' })).toBeNull();
		expect(screen.getByText('settings.integrations.trello.WEBHOOKS_OFF')).toBeTruthy();
	});

	it('the disconnect confirmation shows only a disconnect error, never a mapping one', () => {
		const trello = connected({ actionError: new Error('mapping failed') });
		const { rerender } = render(<TrelloProviderSection trello={trello} />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.trello.DISCONNECT' }));
		expect((screen.getByTestId('trello-disconnect-dialog')).textContent ?? '').toMatch(/^settings\.integrations\.trello\.DISCONNECT_TITLE$/);
		rerender(<TrelloProviderSection trello={{ ...trello, disconnectError: new Error('disconnect failed') }} />);
		expect(screen.getByTestId('trello-disconnect-dialog').textContent).toMatch(/DISCONNECT_TITLE \| /);
	});
});
