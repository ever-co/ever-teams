/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockDiscard = jest.fn();
const mockResetFailure = jest.fn();
let mockDiscardState: Record<string, unknown> = {};

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key
}));
jest.mock('@/core/hooks/timer/use-timer-discard', () => ({ useTimerDiscard: () => mockDiscardState }));
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

function stateOf(overrides: Record<string, unknown> = {}) {
	return {
		availability: { available: true, closesAt: null },
		runningSource: 'TEAMS',
		discard: mockDiscard,
		discarding: false,
		failure: null,
		resetFailure: mockResetFailure,
		...overrides
	};
}

beforeEach(() => {
	mockDiscard.mockReset();
	mockResetFailure.mockReset();
	mockDiscardState = stateOf();
});

describe('TimerRunMenu', () => {
	it('offers nothing while the running timer may not be discarded', () => {
		mockDiscardState = stateOf({ availability: { available: false, reason: 'DISABLED' } });

		render(<TimerRunMenu />);

		expect(screen.queryByRole('menuitem')).toBeNull();
		expect(screen.queryByText('menu-trigger')).toBeNull();
	});

	it('asks before discarding, then closes the confirmation once the run is discarded', async () => {
		mockDiscard.mockResolvedValue(true);
		render(<TimerRunMenu />);

		fireEvent.click(screen.getByRole('menuitem', { name: 'timer.discard.ACTION' }));
		expect(await screen.findByText('timer.discard.TITLE')).toBeTruthy();
		expect(screen.getByText('timer.discard.DESCRIPTION')).toBeTruthy();

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'timer.discard.CONFIRM' }));
		});

		expect(mockDiscard).toHaveBeenCalledTimes(1);
		expect(screen.queryByText('timer.discard.TITLE')).toBeNull();
	});

	it('keeps the confirmation open with the reason when the discard is refused', async () => {
		mockDiscard.mockResolvedValue(false);
		const { rerender } = render(<TimerRunMenu />);
		fireEvent.click(screen.getByRole('menuitem', { name: 'timer.discard.ACTION' }));
		await act(async () => {
			fireEvent.click(await screen.findByRole('button', { name: 'timer.discard.CONFIRM' }));
		});

		mockDiscardState = stateOf({ failure: 'TOO_LATE' });
		rerender(<TimerRunMenu />);

		expect(screen.getByText('timer.discard.TITLE')).toBeTruthy();
		expect(screen.getByRole('alert').textContent).toBe('timer.discard.failures.TOO_LATE');
	});

	it('names the app a run started from when it is not this one', async () => {
		mockDiscardState = stateOf({ runningSource: 'DESKTOP' });
		render(<TimerRunMenu />);

		fireEvent.click(screen.getByRole('menuitem', { name: 'timer.discard.ACTION' }));

		expect(
			await screen.findByText('timer.discard.DESCRIPTION_ELSEWHERE(timer.discard.sources.DESKTOP)')
		).toBeTruthy();
	});

	it('shows the discard running and lets nothing else be pressed meanwhile', async () => {
		mockDiscardState = stateOf({ discarding: true });
		render(<TimerRunMenu />);
		fireEvent.click(screen.getByRole('menuitem', { name: 'timer.discard.ACTION' }));

		const action = await screen.findByRole('button', { name: 'timer.discard.DISCARDING' });
		expect((action as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole('button', { name: 'common.CANCEL' }) as HTMLButtonElement).disabled).toBe(true);
	});
});
