/** @jest-environment jsdom */
/**
 * The run menu with its own discard hook: the confirmation discards the run it was opened for, even when the timer
 * moved to another run (stopped and started again on another device) while it was open.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import { timerStatusState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

const mockDiscardTimer = jest.fn();

jest.mock('@/core/services/client/api/timers/timer.service', () => ({
	timerService: { discardTimer: (...args: unknown[]) => mockDiscardTimer(...args) }
}));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: () => ({ isError: false, refetch: jest.fn() })
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The menu renders inline, so its item can be used without opening it.
jest.mock('@/core/components/common/dropdown-menu', () => ({
	DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: () => <button type="button">menu-trigger</button>,
	DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuItem: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
		<div role="menuitem" onClick={onClick}>
			{children}
		</div>
	)
}));
jest.mock('@/core/components/common/tooltip', () => ({
	Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ render: trigger }: { render?: React.ReactNode }) => <>{trigger}</>,
	TooltipContent: () => null
}));

import { TimerRunMenu } from './timer-run-menu';

const runOf = (id: string) => ({
	running: true,
	duration: 0,
	lastLog: { id, startedAt: new Date(Date.now() - 60_000), source: 'TEAMS' }
});

it('discards the run the confirmation was opened for, not the one running when it is confirmed', async () => {
	mockDiscardTimer.mockResolvedValue({ data: { running: false, duration: 0 } });
	const store = createStore();
	store.set(timerStatusState, runOf('run-a') as never);
	store.set(currentOrganizationState, { id: 'organization-1', allowDiscardTimer: null } as never);
	const client = new QueryClient();
	render(
		<QueryClientProvider client={client}>
			<Provider store={store}>
				<TimerRunMenu />
			</Provider>
		</QueryClientProvider>
	);

	fireEvent.click(screen.getByRole('menuitem', { name: 'timer.discard.ACTION' }));
	expect(await screen.findByText('timer.discard.TITLE')).toBeTruthy();
	// Run A was stopped and run B started on another device; a status read brings B while the dialog is open
	act(() => {
		store.set(timerStatusState, runOf('run-b') as never);
	});
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'timer.discard.CONFIRM' }));
	});

	expect(mockDiscardTimer).toHaveBeenCalledTimes(1);
	expect(mockDiscardTimer).toHaveBeenCalledWith({ timeLogId: 'run-a' });
	client.clear();
});
