/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockLogOut = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children }: { href: string; children?: React.ReactNode }) => <a href={href}>{children}</a>
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ logOut: mockLogOut })
}));
jest.mock('@/core/components/icons', () => ({ Key: () => null, Mail: () => null }));
// The menu renders inline, so its items can be read without opening it.
jest.mock('@/core/components/common/dropdown-menu', () => ({
	DropdownMenuItem: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
		<div role="menuitem" onClick={onClick}>
			{children}
		</div>
	)
}));

import { NoOtherWorkspace } from './no-other-workspace';

describe('NoOtherWorkspace', () => {
	beforeEach(() => mockLogOut.mockReset());

	it('keeps the plain line for a confirmed address', () => {
		render(<NoOtherWorkspace isAddressUnconfirmed={false} />);

		expect(screen.getByText('switchers.NO_OTHER_WORKSPACE')).toBeTruthy();
		expect(screen.queryByRole('menuitem')).toBeNull();
	});

	it('explains an unconfirmed address and offers the two ways to reach the other workspaces', () => {
		render(<NoOtherWorkspace isAddressUnconfirmed />);

		expect(screen.queryByText('switchers.NO_OTHER_WORKSPACE')).toBeNull();
		expect(screen.getByText('switchers.UNCONFIRMED_ADDRESS')).toBeTruthy();
		const confirmLink = screen.getByRole('link', { name: 'switchers.CONFIRM_ADDRESS' });
		expect(confirmLink.getAttribute('href')).toBe('/settings/personal');
		expect(screen.getAllByRole('menuitem')).toHaveLength(2);
	});

	it('signs out on the way to a code sign-in', () => {
		render(<NoOtherWorkspace isAddressUnconfirmed />);

		fireEvent.click(screen.getByText('switchers.SIGN_IN_WITH_CODE'));

		expect(mockLogOut).toHaveBeenCalledTimes(1);
	});
});
