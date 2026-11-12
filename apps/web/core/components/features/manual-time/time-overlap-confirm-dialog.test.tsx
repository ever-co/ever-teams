/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeOverlapGuard } from '@/core/hooks/timesheet/use-time-overlap-guard';
import type { OverlappedEntry } from '@/core/lib/utils/time-log-overlap';
import { TimeOverlapCheckError, TimeOverlapConfirmDialog } from './time-overlap-confirm-dialog';

type MockConsequence = { key: string; text: React.ReactNode };

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	description: string;
	consequences: MockConsequence[];
	confirmLabel: string;
	onConfirm: () => void;
	onClose: () => void;
	children?: React.ReactNode;
};

// The keys stand for the texts, followed by the values they are given
function translate(key: string, values?: Record<string, unknown>) {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en'
}));
jest.mock('@/core/components/icons', () => ({ CircleAlert: () => null, Clock: () => null }));
jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: (props: MockConfirmDialogProps) => {
		if (!props.open) {
			return null;
		}
		return (
			<div role="dialog">
				<h2>{props.title}</h2>
				<p>{props.description}</p>
				<ul>
					{props.consequences.map((consequence) => (
						<li key={consequence.key}>{consequence.text}</li>
					))}
				</ul>
				{props.children}
				<button type="button" onClick={props.onClose}>
					cancel
				</button>
				<button type="button" onClick={props.onConfirm}>
					{props.confirmLabel}
				</button>
			</div>
		);
	}
}));

function entry(id: string, overrides: Partial<OverlappedEntry> = {}): OverlappedEntry {
	return {
		id,
		start: new Date(2026, 10, 10, 18, 42),
		end: new Date(2026, 10, 10, 19, 20),
		isRunning: false,
		overlappedSeconds: 37 * 60,
		taskTitle: `Task ${id}`,
		projectName: null,
		...overrides
	};
}

function guardWith(entries: OverlappedEntry[], overrides: Partial<TimeOverlapGuard> = {}): TimeOverlapGuard {
	let totalSeconds = 0;
	for (const item of entries) {
		totalSeconds += item.overlappedSeconds;
	}
	return {
		saveAfterCheck: jest.fn(),
		isChecking: false,
		hasCheckFailed: false,
		isConfirmOpen: true,
		summary: { totalSeconds, entries },
		confirm: jest.fn(),
		cancel: jest.fn(),
		...overrides
	};
}

describe('TimeOverlapConfirmDialog', () => {
	it('names the real duration that would be removed and the entry it comes from', () => {
		render(<TimeOverlapConfirmDialog guard={guardWith([entry('a')])} confirmLabel="Add time anyway" />);

		expect(screen.getByText('timeOverlap.TITLE {"duration":"37m"}')).toBeTruthy();
		expect(screen.getByText('timeOverlap.DESCRIPTION {"count":1}')).toBeTruthy();
		expect(screen.getByText('Task a')).toBeTruthy();
		const entryLine = screen.getByText(/timeOverlap\.ENTRY_REMOVED/).textContent ?? '';
		expect(entryLine).toContain('"duration":"37m"');
		expect(entryLine).toContain('6:42');
		expect(entryLine).toContain('7:20');
	});

	it('names an entry by its project, or says it has no task', () => {
		const entries = [
			entry('a', { taskTitle: null, projectName: 'Website' }),
			entry('b', { taskTitle: null, projectName: null })
		];
		render(<TimeOverlapConfirmDialog guard={guardWith(entries)} confirmLabel="Save anyway" />);

		expect(screen.getByText('Website')).toBeTruthy();
		expect(screen.getByText('timeOverlap.NO_TASK')).toBeTruthy();
		expect(screen.getByText('timeOverlap.TITLE {"duration":"1h 14m"}')).toBeTruthy();
	});

	it('says a running entry is still running instead of giving it an end', () => {
		render(
			<TimeOverlapConfirmDialog guard={guardWith([entry('a', { isRunning: true })])} confirmLabel="Save anyway" />
		);

		const entryLine = screen.getByText(/timeOverlap\.ENTRY_REMOVED/).textContent ?? '';
		expect(entryLine).toContain('timeOverlap.RUNNING_SINCE');
		expect(entryLine).not.toContain('7:20');
	});

	it('lists five entries and counts the rest', () => {
		const entries = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => entry(id));
		render(<TimeOverlapConfirmDialog guard={guardWith(entries)} confirmLabel="Save anyway" />);

		expect(screen.getAllByRole('listitem')).toHaveLength(5);
		expect(screen.getByText('timeOverlap.MORE_ENTRIES {"count":2}')).toBeTruthy();
		expect(screen.getByText('timeOverlap.DESCRIPTION {"count":7}')).toBeTruthy();
	});

	it('confirms and cancels through the guard', () => {
		const guard = guardWith([entry('a')]);
		render(<TimeOverlapConfirmDialog guard={guard} confirmLabel="Add time anyway" />);

		fireEvent.click(screen.getByRole('button', { name: 'Add time anyway' }));
		fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

		expect(guard.confirm).toHaveBeenCalledTimes(1);
		expect(guard.cancel).toHaveBeenCalledTimes(1);
	});

	it('shows nothing while the guard holds no save', () => {
		render(<TimeOverlapConfirmDialog guard={guardWith([], { isConfirmOpen: false })} confirmLabel="Save anyway" />);

		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('TimeOverlapCheckError', () => {
	it('says the check failed and nothing was saved', () => {
		render(<TimeOverlapCheckError guard={guardWith([], { isConfirmOpen: false, hasCheckFailed: true })} />);

		expect(screen.getByRole('alert').textContent).toBe('timeOverlap.CHECK_FAILED');
	});

	it('shows nothing when the check went through', () => {
		render(<TimeOverlapCheckError guard={guardWith([], { isConfirmOpen: false })} />);

		expect(screen.queryByRole('alert')).toBeNull();
	});
});
