/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { MergePlaceholderDialog } from './merge-placeholder-dialog';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/components/icons', () => {
	const Icon = () => null;
	return { Alert: Icon, Clock: Icon, Spinner: Icon, Task: Icon, UserRemove: Icon, Users: Icon };
});
jest.mock('@/core/components/common/toast-moment', () => ({ toastMoment: jest.fn() }));
jest.mock('./people-parts', () => ({
	MemberAvatar: () => null,
	PersonLines: ({ name }: { name: string }) => <span>{name}</span>
}));
// A native select stands for the app's: what is under test is what the dialog does with the choice
jest.mock('@/core/components/common/select', () => ({
	Select: ({
		value,
		onValueChange,
		children
	}: {
		value: string;
		onValueChange: (value: string) => void;
		children: React.ReactNode;
	}) => (
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
	ConfirmDestructiveDialog: ({
		open,
		subject,
		onClose
	}: {
		open: boolean;
		subject: React.ReactNode;
		onClose: () => void;
	}) =>
		open ? (
			<div role="dialog">
				{subject}
				<button type="button" onClick={onClose}>
					close
				</button>
			</div>
		) : null
}));

function rowOf(overrides: Partial<MemberRowModel>): MemberRowModel {
	return {
		id: 'row',
		name: '',
		email: '',
		imageUrl: null,
		employeeId: null,
		isPlaceholder: false,
		...overrides
	} as MemberRowModel;
}

const LENA = rowOf({ id: 'row-lena', name: 'Lena Weber', employeeId: 'employee-lena', isPlaceholder: true });
const CARTER = rowOf({ id: 'row-carter', name: 'Carter N.', employeeId: 'employee-carter' });

describe('merging a member without an account', () => {
	it('opens again on the same member with no choice and no preview after a close while the preview was read', async () => {
		const onPreview = jest.fn(() => new Promise<never>(() => undefined));
		const props = { targets: [CARTER], onPreview, onMerge: jest.fn(), onClose: jest.fn() };
		const { rerender } = render(<MergePlaceholderDialog member={LENA} {...props} />);

		await act(async () => {
			fireEvent.change(screen.getByLabelText('target'), { target: { value: 'employee-carter' } });
		});
		expect(screen.getByText('settings.members.placeholder.MERGE_READING')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'close' }));
		expect(props.onClose).toHaveBeenCalled();
		rerender(<MergePlaceholderDialog member={null} {...props} />);
		rerender(<MergePlaceholderDialog member={LENA} {...props} />);

		expect(screen.queryByText('settings.members.placeholder.MERGE_READING')).toBeNull();
		expect((screen.getByLabelText('target') as HTMLSelectElement).value).toBe('');
	});
});
