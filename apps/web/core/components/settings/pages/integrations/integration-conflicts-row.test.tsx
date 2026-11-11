/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
	IntegrationConflicts,
	IntegrationConflictsOptions
} from '@/core/hooks/integrations/use-integration-conflicts';
import type { IIntegrationSyncConflict } from '@/core/types/interfaces/integrations/integration-sync-conflict';
import { IntegrationConflictsRow } from './integration-conflicts-row';

const mockUseConflicts = jest.fn<IntegrationConflicts, [IntegrationConflictsOptions]>();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
		<a href={href} className={className}>
			{children}
		</a>
	)
}));
jest.mock('@/core/hooks/integrations/use-integration-conflicts', () => ({
	useIntegrationConflicts: (options: IntegrationConflictsOptions) => mockUseConflicts(options)
}));

const KEYS = 'settings.integrations.conflicts';

function conflict(overrides: Partial<IIntegrationSyncConflict> = {}): IIntegrationSyncConflict {
	return {
		id: 'c-1',
		integrationId: 'int-1',
		mappingId: 'map-1',
		runId: 'run-1',
		taskId: 'task-1',
		sourceId: 'issue-1',
		field: 'title',
		syncedValue: 'Old',
		platformValue: 'Ours',
		externalValue: 'Theirs',
		status: 'open',
		resolution: null,
		resolvedAt: null,
		resolvedByUserId: null,
		createdAt: '2026-11-11T08:00:00.000Z',
		...overrides
	};
}

function list(overrides: Partial<IntegrationConflicts> = {}): IntegrationConflicts {
	return {
		conflicts: [],
		canShowMore: false,
		showMore: jest.fn(),
		isLoading: false,
		readError: null,
		isRetrying: false,
		retry: jest.fn(),
		titleOf: jest.fn().mockReturnValue(null),
		resolvingId: null,
		resolve: jest.fn().mockResolvedValue(undefined),
		resolved: null,
		resolveError: null,
		clearFeedback: jest.fn(),
		...overrides
	};
}

function renderRow(runId: string | null = null, onClearRun = jest.fn()) {
	return render(
		<IntegrationConflictsRow
			provider="linear"
			providerName="Linear"
			integrationId="int-1"
			runId={runId}
			onClearRun={onClearRun}
		/>
	);
}

// The notices' orb reads `window.matchMedia`, which jsdom does not provide.
beforeAll(() => {
	window.matchMedia = jest.fn().mockReturnValue({
		matches: false,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		addListener: jest.fn(),
		removeListener: jest.fn()
	}) as unknown as typeof window.matchMedia;
});

describe('IntegrationConflictsRow', () => {
	beforeEach(() => mockUseConflicts.mockReset());

	it('lists each conflict: the task, the field, the item, both values, when; with the two resolutions', () => {
		const state = list({
			conflicts: [
				conflict(),
				conflict({
					id: 'c-2',
					taskId: 'task-2',
					field: 'description',
					platformValue: '<p>Our <b>text</b></p>',
					externalValue: null
				}),
				conflict({
					id: 'c-3',
					taskId: 'task-3',
					field: 'dueDate',
					platformValue: '2026-11-20T09:00:00.000Z',
					externalValue: '2026-11-21T09:00:00.000Z'
				})
			],
			titleOf: jest.fn((item: IIntegrationSyncConflict) => (item.taskId === 'task-1' ? 'Fix login' : null))
		});
		mockUseConflicts.mockReturnValue(state);
		renderRow();

		expect(mockUseConflicts).toHaveBeenCalledWith({
			provider: 'linear',
			integrationId: 'int-1',
			status: 'open',
			runId: null
		});
		const first = within(screen.getByTestId('conflict-c-1'));
		expect(first.getByRole('link', { name: 'Fix login' }).getAttribute('href')).toBe('/task/task-1');
		expect(first.getByText(`${KEYS}.FIELD_title`)).toBeTruthy();
		expect(first.getByText(`${KEYS}.ITEM {"provider":"Linear","id":"issue-1"}`)).toBeTruthy();
		expect(first.getByText('Ours')).toBeTruthy();
		expect(first.getByText('Theirs')).toBeTruthy();
		expect(first.getByText(new RegExp(`^${KEYS}.FOUND`))).toBeTruthy();

		const description = within(screen.getByTestId('conflict-c-2'));
		// A task whose title the app does not hold still opens.
		expect(description.getByRole('link', { name: `${KEYS}.OPEN_TASK · task-2` }).getAttribute('href')).toBe(
			'/task/task-2'
		);
		expect(description.getByText('Our text')).toBeTruthy();
		expect(screen.getByTestId('conflict-c-2').querySelector('b')).toBeNull();
		expect(description.getByText(`${KEYS}.EMPTY_VALUE`)).toBeTruthy();

		expect(within(screen.getByTestId('conflict-c-3')).getByText('Nov 20, 2026')).toBeTruthy();

		fireEvent.click(first.getByRole('button', { name: `${KEYS}.KEEP_PROVIDER {"provider":"Linear"}` }));
		expect(state.resolve).toHaveBeenCalledWith('c-1', 'external');
		fireEvent.click(first.getByRole('button', { name: `${KEYS}.KEEP_TASK` }));
		expect(state.resolve).toHaveBeenCalledWith('c-1', 'platform');
	});

	it('while one resolves, no other can be', () => {
		mockUseConflicts.mockReturnValue(
			list({ conflicts: [conflict(), conflict({ id: 'c-2' })], resolvingId: 'c-1' })
		);
		renderRow();
		const second = within(screen.getByTestId('conflict-c-2'));
		expect((second.getByRole('button', { name: `${KEYS}.KEEP_TASK` }) as HTMLButtonElement).disabled).toBe(true);
		expect(screen.getByTestId('conflict-c-1').getAttribute('aria-busy')).toBe('true');
	});

	it('says what a resolve did, and why one was refused', () => {
		const state = list({ resolved: 'platform' });
		mockUseConflicts.mockReturnValue(state);
		const { rerender } = renderRow();
		expect(screen.getByText(`${KEYS}.KEPT_TASK`)).toBeTruthy();

		mockUseConflicts.mockReturnValue(
			list({ resolveError: { refusal: 'stale', error: { response: { status: 409 } } } })
		);
		rerender(
			<IntegrationConflictsRow
				provider="linear"
				providerName="Linear"
				integrationId="int-1"
				runId={null}
				onClearRun={jest.fn()}
			/>
		);
		expect(screen.getByText(`${KEYS}.ERROR_TITLE`)).toBeTruthy();
		expect(screen.getByText(`${KEYS}.ERROR_STALE {"provider":"Linear"}`)).toBeTruthy();

		mockUseConflicts.mockReturnValue(
			list({ resolveError: { refusal: 'notFound', error: { response: { status: 404 } } } })
		);
		rerender(
			<IntegrationConflictsRow
				provider="linear"
				providerName="Linear"
				integrationId="int-1"
				runId={null}
				onClearRun={jest.fn()}
			/>
		);
		expect(screen.getByText(`${KEYS}.ERROR_NOT_FOUND`)).toBeTruthy();

		// Anything else: the reason in the user's words, never the server's text.
		mockUseConflicts.mockReturnValue(
			list({
				resolveError: {
					refusal: 'other',
					error: { response: { status: 403, data: { message: 'Forbidden resource' } } }
				}
			})
		);
		rerender(
			<IntegrationConflictsRow
				provider="linear"
				providerName="Linear"
				integrationId="int-1"
				runId={null}
				onClearRun={jest.fn()}
			/>
		);
		expect(screen.queryByText(/Forbidden resource/)).toBeNull();
		expect(screen.getByText(/^toasts\.REASONS\./)).toBeTruthy();
	});

	it('switches to the resolved ones, which say how each ended and offer no resolution', () => {
		mockUseConflicts.mockReturnValue(list());
		renderRow();
		expect(screen.getByText(`${KEYS}.EMPTY_OPEN`)).toBeTruthy();

		mockUseConflicts.mockReturnValue(
			list({
				conflicts: [
					conflict({
						status: 'resolved',
						resolution: 'kept_external',
						resolvedAt: '2026-11-11T09:00:00.000Z'
					})
				]
			})
		);
		fireEvent.click(screen.getByRole('button', { name: `${KEYS}.STATUS_resolved` }));

		expect(mockUseConflicts).toHaveBeenLastCalledWith({
			provider: 'linear',
			integrationId: 'int-1',
			status: 'resolved',
			runId: null
		});
		const row = within(screen.getByTestId('conflict-c-1'));
		expect(row.getByText(new RegExp(`^${KEYS}.RESOLVED_kept_external`))).toBeTruthy();
		expect(row.queryByRole('button')).toBeNull();
		expect(screen.getByRole('button', { name: `${KEYS}.STATUS_resolved` }).getAttribute('aria-pressed')).toBe(
			'true'
		);
	});

	it("one run's conflicts: says so, and Show every run clears the filter", () => {
		mockUseConflicts.mockReturnValue(list());
		const onClearRun = jest.fn();
		renderRow('run-1', onClearRun);
		expect(mockUseConflicts).toHaveBeenCalledWith({
			provider: 'linear',
			integrationId: 'int-1',
			status: 'open',
			runId: 'run-1'
		});
		fireEvent.click(
			within(screen.getByTestId('conflicts-run-filter')).getByRole('button', { name: `${KEYS}.SHOW_ALL` })
		);
		expect(onClearRun).toHaveBeenCalled();
	});

	it('a failed read offers a retry; while loading it says so', () => {
		const state = list({ readError: { response: { status: 500 } } });
		mockUseConflicts.mockReturnValue(state);
		const { rerender } = renderRow();
		expect(screen.getByText(`${KEYS}.LOAD_ERROR`)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));
		expect(state.retry).toHaveBeenCalled();

		mockUseConflicts.mockReturnValue(list({ isLoading: true }));
		rerender(
			<IntegrationConflictsRow
				provider="linear"
				providerName="Linear"
				integrationId="int-1"
				runId={null}
				onClearRun={jest.fn()}
			/>
		);
		expect(screen.getByText(`${KEYS}.LOADING`)).toBeTruthy();
	});

	it('a cut value is shown whole on request, without relying on the tooltip', () => {
		const long = 'word '.repeat(80).trim();
		mockUseConflicts.mockReturnValue(
			list({ conflicts: [conflict({ field: 'description', platformValue: long })] })
		);
		renderRow();
		const row = within(screen.getByTestId('conflict-c-1'));
		expect(row.queryByText(long)).toBeNull();
		const toggle = row.getByRole('button', { name: `${KEYS}.SHOW_FULL` });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		// Short values offer nothing to expand.
		expect(row.getAllByRole('button', { name: `${KEYS}.SHOW_FULL` })).toHaveLength(1);

		fireEvent.click(toggle);
		expect(row.getByText(long)).toBeTruthy();
		expect(row.getByRole('button', { name: `${KEYS}.SHOW_LESS` }).getAttribute('aria-expanded')).toBe('true');
	});

	it('a full page offers the older conflicts', () => {
		const state = list({ conflicts: [conflict()], canShowMore: true });
		mockUseConflicts.mockReturnValue(state);
		renderRow();
		fireEvent.click(screen.getByRole('button', { name: `${KEYS}.SHOW_MORE` }));
		expect(state.showMore).toHaveBeenCalled();
	});

	it('a due date stored as UTC midnight is shown as that calendar day', () => {
		mockUseConflicts.mockReturnValue(
			list({
				conflicts: [
					conflict({
						field: 'dueDate',
						platformValue: '2026-11-20T00:00:00.000Z',
						externalValue: '2026-11-21T00:00:00.000Z'
					})
				]
			})
		);
		renderRow();
		const row = within(screen.getByTestId('conflict-c-1'));
		expect(row.getByText('Nov 20, 2026')).toBeTruthy();
		expect(row.getByText('Nov 21, 2026')).toBeTruthy();
	});
});
