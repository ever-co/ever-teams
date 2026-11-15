/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { MergePlaceholderDialog } from './merge-placeholder-dialog';

type MockSelectProps = { value: string; onValueChange: (value: string | null) => void; children: React.ReactNode };

type MockDialogProps = {
	open: boolean;
	onClose: () => void;
	subject?: React.ReactNode;
	confirmDisabled?: boolean;
	onConfirm: () => void;
};

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/components/icons', () => ({
	Alert: () => null,
	Clock: () => null,
	Spinner: () => null,
	Task: () => null,
	UserRemove: () => null,
	Users: () => null
}));
jest.mock('@/core/components/common/toast-moment', () => ({ toastMoment: jest.fn() }));
jest.mock('./people-parts', () => ({
	MemberAvatar: () => null,
	PersonLines: ({ name }: { name: string }) => <span>{name}</span>
}));
jest.mock('@/core/components/common/select', () => ({
	Select: ({ value, onValueChange, children }: MockSelectProps) => (
		<select aria-label="target" value={value} onChange={(event) => onValueChange(event.target.value)}>
			<option value="">none</option>
			{children}
		</select>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
	SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
		<option value={value}>{children}</option>
	)
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: ({ open, onClose, subject, confirmDisabled, onConfirm }: MockDialogProps) =>
		open ? (
			<div role="dialog">
				{subject}
				<button type="button" onClick={onClose}>
					cancel
				</button>
				<button type="button" onClick={onConfirm} disabled={confirmDisabled}>
					merge
				</button>
			</div>
		) : null
}));

function rowOf(employeeId: string, name: string, isPlaceholder: boolean): MemberRowModel {
	return { id: `row-${employeeId}`, employeeId, name, email: '', imageUrl: null, isPlaceholder } as MemberRowModel;
}

const AMINA = rowOf('employee-amina', 'Amina Diallo', true);
const TARGETS = [rowOf('employee-paul', 'Paul Martin', false)];

const PREVIEW = {
	placeholderEmployeeId: 'employee-amina',
	targetEmployeeId: 'employee-paul',
	timeLogs: 2,
	duration: 7200,
	timesheets: 1,
	taskAssignments: 0,
	teams: [],
	overlappingTimeLogs: 0
};

describe('MergePlaceholderDialog', () => {
	it('starts afresh when the same member is opened again after a close while the preview was read', async () => {
		let answerPreview: (value: typeof PREVIEW) => void = () => undefined;
		const onPreview = jest.fn(
			() =>
				new Promise<typeof PREVIEW>((resolve) => {
					answerPreview = resolve;
				})
		);
		const onClose = jest.fn();
		const dialogOf = (member: MemberRowModel | null) => (
			<MergePlaceholderDialog
				member={member}
				targets={TARGETS}
				onClose={onClose}
				onPreview={onPreview}
				onMerge={jest.fn()}
			/>
		);
		const { rerender } = render(dialogOf(AMINA));

		fireEvent.change(screen.getByRole('combobox', { name: 'target' }), { target: { value: 'employee-paul' } });
		expect(screen.getByText('settings.members.placeholder.MERGE_READING')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
		rerender(dialogOf(null));
		// The answer of the closed dialog's preview arrives late, and is dropped
		await act(async () => {
			answerPreview(PREVIEW);
		});
		rerender(dialogOf(AMINA));

		expect(screen.queryByText('settings.members.placeholder.MERGE_READING')).toBeNull();
		expect((screen.getByRole('combobox', { name: 'target' }) as HTMLSelectElement).value).toBe('');
		expect((screen.getByRole('button', { name: 'merge' }) as HTMLButtonElement).disabled).toBe(true);
	});
});
