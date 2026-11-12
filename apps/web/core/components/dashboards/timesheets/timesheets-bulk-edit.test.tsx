/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentType, useState } from 'react';
import { useBulkEditDialog } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-dialog';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

type MockDialogProps = { isOpen: boolean; closeModal: () => void; logs: ReadonlyArray<ITimeLog> };

jest.mock('next/dynamic', () => {
	const { createElement, lazy, Suspense } = jest.requireActual<typeof import('react')>('react');
	return {
		__esModule: true,
		default: (loader: () => Promise<ComponentType<object>>) => {
			const Lazy = lazy(async () => ({ default: await loader() }));
			return function Loaded(props: object) {
				return createElement(Suspense, { fallback: null }, createElement(Lazy, props));
			};
		}
	};
});

// A stand-in that holds a pick in its own state, as the real dialog holds its three fields
jest.mock('./timesheets-bulk-edit-dialog', () => {
	const { useState: useMockState } = jest.requireActual<typeof import('react')>('react');
	return {
		TimesheetsBulkEditDialog: function MockBulkEditDialog({ isOpen, closeModal, logs }: MockDialogProps) {
			const [isBillablePicked, setIsBillablePicked] = useMockState(false);
			let shownChoice = 'Keep as is';
			if (isBillablePicked) {
				shownChoice = 'Billable';
			}
			return (
				<div role="dialog" aria-label={`Edit ${logs.length}`} data-open={String(isOpen)}>
					<p>{shownChoice}</p>
					<button type="button" onClick={() => setIsBillablePicked(true)}>
						Pick billable
					</button>
					<button type="button" onClick={closeModal}>
						Close
					</button>
				</div>
			);
		}
	};
});

import { TimesheetsBulkEdit } from './timesheets-bulk-edit';

const admin: TimesheetPermissions = {
	hasOrganizationRole: true,
	isManage: true,
	canApprove: true,
	userId: 'user-admin',
	employeeId: 'admin'
};

function logOf(id: string): ITimeLog {
	return { id, duration: 3600, version: '1' };
}

function SelectionWithBulkEdit({ ticked }: Readonly<{ ticked: ITimeLog[] }>) {
	const dialog = useBulkEditDialog();
	const [selection, setSelection] = useState(ticked);
	const tickAnother = () => setSelection((current) => [...current, logOf('ticked-later')]);
	return (
		<>
			<button type="button" onClick={() => dialog.open(selection)}>
				Edit
			</button>
			<button type="button" onClick={tickAnother}>
				Tick another
			</button>
			<TimesheetsBulkEdit dialog={dialog} permissions={admin} onFinished={jest.fn()} />
		</>
	);
}

function clickEdit() {
	fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
}

describe('TimesheetsBulkEdit', () => {
	it('loads no dialog until Edit first opens it', async () => {
		render(<SelectionWithBulkEdit ticked={[logOf('a')]} />);

		expect(screen.queryByRole('dialog')).toBeNull();

		clickEdit();

		expect(await screen.findByRole('dialog', { name: 'Edit 1' })).toBeTruthy();
	});

	it('edits the entries ticked when it opened, whatever is ticked behind it', async () => {
		render(<SelectionWithBulkEdit ticked={[logOf('a'), logOf('b')]} />);

		clickEdit();
		await screen.findByRole('dialog', { name: 'Edit 2' });
		fireEvent.click(screen.getByRole('button', { name: 'Tick another' }));

		expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Edit 2');
	});

	it('starts over on Keep as is at each opening, and keeps its entries while it closes', async () => {
		render(<SelectionWithBulkEdit ticked={[logOf('a')]} />);

		clickEdit();
		await screen.findByRole('dialog');
		fireEvent.click(screen.getByRole('button', { name: 'Pick billable' }));
		fireEvent.click(screen.getByRole('button', { name: 'Close' }));

		expect(screen.getByRole('dialog', { name: 'Edit 1' }).getAttribute('data-open')).toBe('false');
		expect(screen.getByText('Billable')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'Tick another' }));
		clickEdit();

		expect(await screen.findByText('Keep as is')).toBeTruthy();
		expect(screen.getByRole('dialog', { name: 'Edit 2' }).getAttribute('data-open')).toBe('true');
	});

	it('does not open on a selection without entries', () => {
		render(<SelectionWithBulkEdit ticked={[]} />);

		clickEdit();

		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
