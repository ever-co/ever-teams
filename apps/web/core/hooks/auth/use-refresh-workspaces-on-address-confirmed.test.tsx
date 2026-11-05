/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
	useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries })
}));

import { useRefreshWorkspacesOnAddressConfirmed } from './use-refresh-workspaces-on-address-confirmed';

function renderWith(initial: boolean | undefined) {
	return renderHook(({ isEmailVerified }) => useRefreshWorkspacesOnAddressConfirmed(isEmailVerified), {
		initialProps: { isEmailVerified: initial }
	});
}

describe('useRefreshWorkspacesOnAddressConfirmed', () => {
	beforeEach(() => mockInvalidateQueries.mockReset());

	it('reads the workspaces again once the address turns confirmed', () => {
		const { rerender } = renderWith(false);

		rerender({ isEmailVerified: true });

		expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
		expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
	});

	it('waits for the confirmed address while the user is read again', () => {
		const { rerender } = renderWith(false);

		rerender({ isEmailVerified: undefined });
		expect(mockInvalidateQueries).not.toHaveBeenCalled();

		rerender({ isEmailVerified: true });
		expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
	});

	it('does nothing for an address confirmed from the start', () => {
		const { rerender } = renderWith(undefined);

		rerender({ isEmailVerified: true });
		rerender({ isEmailVerified: true });

		expect(mockInvalidateQueries).not.toHaveBeenCalled();
	});

	it('does nothing while the address stays unconfirmed', () => {
		const { rerender } = renderWith(false);

		rerender({ isEmailVerified: false });

		expect(mockInvalidateQueries).not.toHaveBeenCalled();
	});
});
