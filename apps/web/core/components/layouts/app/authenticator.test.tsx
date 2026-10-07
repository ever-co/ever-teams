/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { withAuthentication } from './authenticator';

jest.mock('jotai', () => ({
	useAtom: () => [{ id: 'authenticated-user' }, jest.fn()]
}));

jest.mock('@/core/stores', () => ({
	userState: {},
	isTeamMemberState: {}
}));

jest.mock('@/core/lib/helpers/index', () => ({
	getNoTeamPopupShowCookie: () => false,
	setNoTeamPopupShowCookie: jest.fn()
}));

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: { id: 'authenticated-user' },
		isLoading: false,
		isSuccess: true
	})
}));

jest.mock('@/core/components', () => ({
	BackdropLoader: () => null
}));

jest.mock('../../common/global-skeleton', () => () => null);
jest.mock('../../common/skeleton/modal-skeleton', () => ({ ModalSkeleton: () => null }));
jest.mock('../../optimized-components', () => ({
	LazyCreateTeamModal: () => null,
	LazyJoinTeamModal: () => null
}));

describe('withAuthentication', () => {
	it('preserves the viewport height boundary for authenticated page scrollers', () => {
		const ProtectedPage = () => <main data-testid="protected-page">Protected page</main>;
		const AuthenticatedPage = withAuthentication(ProtectedPage, { displayName: 'ProtectedPage' });

		render(<AuthenticatedPage />);

		const authenticatedBoundary = screen.getByTestId('protected-page').parentElement;
		expect(authenticatedBoundary).not.toBeNull();
		expect(authenticatedBoundary?.className).toContain('h-full');
		expect(authenticatedBoundary?.className).toContain('min-h-0');
	});
});
