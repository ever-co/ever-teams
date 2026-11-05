/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { withAuthentication } from './authenticator';

type StoredUser = { id: string; updatedAt?: Date };

let mockStoredUser: StoredUser | null = { id: 'authenticated-user' };
let mockLatestStoredUser: StoredUser | null | undefined = undefined;
let mockQueriedUser: StoredUser = { id: 'authenticated-user' };
const mockSetUser = jest.fn();

function latestStoredUser() {
	if (mockLatestStoredUser === undefined) {
		return mockStoredUser;
	}
	return mockLatestStoredUser;
}

jest.mock('jotai', () => ({
	useAtom: () => [mockStoredUser, mockSetUser],
	useStore: () => ({ get: () => latestStoredUser() })
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
		data: mockQueriedUser,
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

beforeEach(() => {
	mockStoredUser = { id: 'authenticated-user' };
	mockLatestStoredUser = undefined;
	mockQueriedUser = { id: 'authenticated-user' };
	mockSetUser.mockReset();
});

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

	it('stores the newer user the server answers, such as after a role change', () => {
		mockStoredUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T08:00:00Z') };
		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T09:00:00Z') };
		const AuthenticatedPage = withAuthentication(() => null, { displayName: 'ProtectedPage' });

		render(<AuthenticatedPage />);

		expect(mockSetUser).toHaveBeenCalledWith(mockQueriedUser);
	});

	it('keeps a stored user that is newer than the query copy', () => {
		mockStoredUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T09:00:00Z') };
		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T08:00:00Z') };
		const AuthenticatedPage = withAuthentication(() => null, { displayName: 'ProtectedPage' });

		render(<AuthenticatedPage />);

		expect(mockSetUser).not.toHaveBeenCalled();
	});

	it('follows a newer version of the signed-in user that the query reads after sign-in', () => {
		mockStoredUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T08:00:00Z') };
		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T08:00:00Z') };
		const AuthenticatedPage = withAuthentication(() => null, { displayName: 'ProtectedPage' });
		const view = render(<AuthenticatedPage />);
		expect(mockSetUser).not.toHaveBeenCalled();

		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T09:00:00Z') };
		view.rerender(<AuthenticatedPage />);

		expect(mockSetUser).toHaveBeenCalledTimes(1);
		expect(mockSetUser).toHaveBeenCalledWith(mockQueriedUser);
	});

	it('ignores an older version of the signed-in user that the query reads after sign-in', () => {
		mockStoredUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T09:00:00Z') };
		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T09:00:00Z') };
		const AuthenticatedPage = withAuthentication(() => null, { displayName: 'ProtectedPage' });
		const view = render(<AuthenticatedPage />);

		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T08:00:00Z') };
		view.rerender(<AuthenticatedPage />);

		expect(mockSetUser).not.toHaveBeenCalled();
	});

	it('keeps a newer user written to the store after the render, before the sync runs', () => {
		mockStoredUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T08:00:00Z') };
		mockLatestStoredUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T10:00:00Z') };
		mockQueriedUser = { id: 'authenticated-user', updatedAt: new Date('2026-11-05T09:00:00Z') };
		const AuthenticatedPage = withAuthentication(() => null, { displayName: 'ProtectedPage' });

		render(<AuthenticatedPage />);

		expect(mockSetUser).not.toHaveBeenCalled();
	});
});
