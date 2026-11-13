/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/common/dropdown-menu', () => ({
	DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
		<button type="button" role="menuitem" onClick={onClick}>
			{children}
		</button>
	),
	DropdownMenuSeparator: () => <hr />
}));

import { type TimeEntryReuseHandlers, TimeEntryReuseButtons, TimeEntryReuseMenuItems } from './time-entry-reuse';

const LOG = { id: 'log-1', taskId: 'task-1' } as unknown as ITimeLog;

function reuseOf(offers: { continues: boolean; duplicates: boolean }): jest.Mocked<TimeEntryReuseHandlers> {
	return {
		canContinue: jest.fn().mockReturnValue(offers.continues),
		continueLog: jest.fn(),
		canDuplicate: jest.fn().mockReturnValue(offers.duplicates),
		duplicate: jest.fn()
	};
}

describe('TimeEntryReuseMenuItems', () => {
	it('offers Continue and Duplicate on the entry, before the other rows of its menu', () => {
		const reuse = reuseOf({ continues: true, duplicates: true });
		render(<TimeEntryReuseMenuItems log={LOG} reuse={reuse} isFollowed />);

		fireEvent.click(screen.getByRole('menuitem', { name: 'timeEntryActions.CONTINUE' }));
		fireEvent.click(screen.getByRole('menuitem', { name: 'timeEntryActions.DUPLICATE' }));

		expect(reuse.continueLog).toHaveBeenCalledWith(LOG);
		expect(reuse.duplicate).toHaveBeenCalledWith(LOG);
		expect(screen.getByRole('separator')).toBeTruthy();
	});

	it('hides Continue where the entry cannot be continued', () => {
		const reuse = reuseOf({ continues: false, duplicates: true });
		render(<TimeEntryReuseMenuItems log={LOG} reuse={reuse} isFollowed />);

		expect(screen.queryByRole('menuitem', { name: 'timeEntryActions.CONTINUE' })).toBeNull();
		expect(screen.getByRole('menuitem', { name: 'timeEntryActions.DUPLICATE' })).toBeTruthy();
	});

	it('adds nothing to a menu, not even a separator, when the entry offers neither', () => {
		const reuse = reuseOf({ continues: false, duplicates: false });
		const { container } = render(<TimeEntryReuseMenuItems log={LOG} reuse={reuse} isFollowed />);

		expect(container.childElementCount).toBe(0);
	});
});

describe('TimeEntryReuseButtons', () => {
	it('closes the layer the entry is shown in before it acts', () => {
		const calls: string[] = [];
		const reuse = reuseOf({ continues: true, duplicates: true });
		reuse.continueLog.mockImplementation(() => calls.push('continue'));
		reuse.duplicate.mockImplementation(() => calls.push('duplicate'));
		const onAct = jest.fn(() => calls.push('close'));
		render(<TimeEntryReuseButtons log={LOG} reuse={reuse} onAct={onAct} />);

		fireEvent.click(screen.getByRole('button', { name: 'timeEntryActions.CONTINUE' }));
		fireEvent.click(screen.getByRole('button', { name: 'timeEntryActions.DUPLICATE' }));

		expect(calls).toEqual(['close', 'continue', 'close', 'duplicate']);
		expect(reuse.continueLog).toHaveBeenCalledWith(LOG);
		expect(reuse.duplicate).toHaveBeenCalledWith(LOG);
	});

	it('shows only what the entry offers', () => {
		const reuse = reuseOf({ continues: false, duplicates: true });
		render(<TimeEntryReuseButtons log={LOG} reuse={reuse} onAct={jest.fn()} />);

		expect(screen.queryByRole('button', { name: 'timeEntryActions.CONTINUE' })).toBeNull();
		expect(screen.getByRole('button', { name: 'timeEntryActions.DUPLICATE' })).toBeTruthy();
	});
});
