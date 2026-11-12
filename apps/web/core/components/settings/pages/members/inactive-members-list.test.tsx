/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InactiveMember } from '@/core/lib/utils/member-access';
import { InactiveMembersList } from './inactive-members-list';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
// The real notice draws its orb with matchMedia, which jsdom does not have.
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) => (
		<div role="status">
			{title}
			{actions}
		</div>
	)
}));

const ANA: InactiveMember = {
	employeeId: 'employee-ana',
	name: 'Ana Lima',
	email: 'ana@example.com',
	imageUrl: null,
	deactivatedAt: new Date('2026-11-05T09:00:00.000Z')
};

const BO: InactiveMember = {
	employeeId: 'employee-bo',
	name: 'bo@example.com',
	email: 'bo@example.com',
	imageUrl: null,
	deactivatedAt: null
};

function renderList(overrides: Partial<React.ComponentProps<typeof InactiveMembersList>> = {}) {
	const props: React.ComponentProps<typeof InactiveMembersList> = {
		members: [ANA, BO],
		isLoading: false,
		isError: false,
		canRestore: true,
		busyIds: new Set<string>(),
		formatDeactivated: (date) => `deactivated ${date.toISOString().slice(0, 10)}`,
		onRetry: jest.fn(),
		onRestore: jest.fn(),
		...overrides
	};
	const view = render(<InactiveMembersList {...props} />);
	return { view, props };
}

it('shows rows that are still loading as placeholders, never as an empty list', () => {
	const { view } = renderList({ isLoading: true, members: [] });

	expect(view.container.querySelector('[aria-busy="true"]')).not.toBeNull();
	expect(screen.queryByText('settings.members.INACTIVE_EMPTY')).toBeNull();
});

it('says the list could not be loaded and reads it again on Retry', () => {
	const { props } = renderList({ isError: true, members: [] });

	expect(screen.getByText('settings.members.INACTIVE_ERROR')).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));

	expect(props.onRetry).toHaveBeenCalledTimes(1);
});

it('says so when no member of the team is deactivated', () => {
	renderList({ members: [] });

	expect(screen.getByText('settings.members.INACTIVE_EMPTY')).toBeTruthy();
	expect(screen.queryByRole('list')).toBeNull();
});

it('lists each member with the day they were deactivated, and their address once', () => {
	renderList();

	const list = screen.getByRole('list', { name: 'settings.members.INACTIVE_LIST' });
	expect(list.querySelectorAll('li')).toHaveLength(2);
	expect(screen.getByText('deactivated 2026-11-05')).toBeTruthy();
	expect(screen.getAllByText('ana@example.com')).toHaveLength(1);
	expect(screen.getAllByText('bo@example.com')).toHaveLength(1);
});

it('holds the Restore of a member whose restoration is on its way', () => {
	renderList({ busyIds: new Set(['employee-ana']) });

	const busy = screen.getByRole('button', { name: 'settings.members.RESTORE_MEMBER {"name":"Ana Lima"}' });
	const idle = screen.getByRole('button', { name: 'settings.members.RESTORE_MEMBER {"name":"bo@example.com"}' });
	expect((busy as HTMLButtonElement).disabled).toBe(true);
	expect((idle as HTMLButtonElement).disabled).toBe(false);
});
