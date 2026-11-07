/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LinearIntegrationSettings } from '@/core/hooks/integrations/use-linear-integration';
import { LinearProviderSection } from './linear-provider';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('@/core/components/common/animated-height', () => ({
	AnimatedHeight: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/components/common/select', () => ({
	Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? ''}</span>,
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	DangerRow: ({ actionLabel, onAction }: { actionLabel: string; onAction: () => void }) => (
		<button type="button" onClick={onAction}>
			{actionLabel}
		</button>
	),
	ConfirmDestructiveDialog: ({ open, title }: { open: boolean; title: string }) => (open ? <p>{title}</p> : null)
}));

function settings(overrides: Partial<LinearIntegrationSettings> = {}): LinearIntegrationSettings {
	return {
		status: 'notConnected',
		readError: null,
		isRetrying: false,
		retry: jest.fn(),
		connection: null,
		defaultStateMap: {},
		callbackError: null,
		teams: [],
		projects: [],
		mappings: [],
		runs: [],
		isLoadingDetails: false,
		actionError: null,
		clearActionError: jest.fn(),
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
		const linear = settings({
			status: 'connected',
			connection: { id: 'int-1', organizationId: 'org-1', linearOrganizationName: 'Acme', attentionReason: null, createdAt: '2026-11-07T00:00:00.000Z' } as never,
			teams: [
				{ id: 't1', key: 'ENG', name: 'Engineering' },
				{ id: 't2', key: 'OPS', name: 'Operations' }
			],
			projects: [{ id: 'p1', name: 'API' }],
			mappings: [{ id: 'm1', integrationId: 'int-1', linearTeamId: 't1', linearTeamKey: 'ENG', linearTeamName: 'Engineering', projectId: 'p1', direction: 'inbound', stateMap: {}, syncEnabled: true, lastImportedAt: null, lastCursor: null, lastError: null }],
			runs: [{ id: 'r1', mappingId: 'm1', kind: 'import', status: 'done', full: false, startedAt: '2026-11-07T01:00:00.000Z', finishedAt: null, createdCount: 3, updatedCount: 1, skippedCount: 0, failedCount: 0, lastError: null }]
		});
		render(<LinearProviderSection linear={linear} />);
		expect(screen.getByText('ENG · Engineering')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.linear.IMPORT_CHANGES' }));
		expect(linear.importNow).toHaveBeenCalledWith('m1', false);
		// The add form offers only the team not mapped yet.
		expect(screen.getByTestId('linear-add-mapping')).toHaveTextContent('OPS · Operations');
		expect(screen.getByTestId('linear-add-mapping')).not.toHaveTextContent('ENG · Engineering');
		expect(screen.getByText('settings.integrations.linear.RUN_import')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'settings.integrations.linear.DISCONNECT' }));
		expect(screen.getByText('settings.integrations.linear.DISCONNECT_TITLE')).toBeInTheDocument();
	});

	it('shows what the platform sent the person back with', () => {
		render(<LinearProviderSection linear={settings({ callbackError: 'denied' })} />);
		expect(screen.getByText('settings.integrations.linear.CALLBACK_denied')).toBeInTheDocument();
	});
});
