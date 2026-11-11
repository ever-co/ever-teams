/** @jest-environment jsdom */
/**
 * `/workspace/welcome` (#5025): where a new workspace opens, with how its invitations went and its first steps.
 */
import { render, screen } from '@testing-library/react';

// The notices animate unless the reader asks for reduced motion: jsdom has no matchMedia
beforeAll(() => {
	window.matchMedia = jest
		.fn()
		.mockReturnValue({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const mockSearch = { current: new URLSearchParams() };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearch.current }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { tenant: { name: 'Lovelace Studio' } } })
}));

import { WorkspaceWelcomePage } from './workspace-welcome-page';

describe('WorkspaceWelcomePage', () => {
	it('names the new workspace, counts the invitations sent and leads to the first steps', () => {
		mockSearch.current = new URLSearchParams('invited=2');

		render(<WorkspaceWelcomePage />);

		expect(
			screen.getByText(/workspaceCreation.WELCOME_DESCRIPTION \{"workspace":"Lovelace Studio"\}/)
		).toBeTruthy();
		expect(screen.getByText(/workspaceCreation.WELCOME_INVITED \{"count":2\}/)).toBeTruthy();
		const steps = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
		expect(steps).toEqual(['/settings/team/members', '/projects', '/', '/']);
	});

	it('says the invitations could not be sent, and nothing about invitations when none were asked', () => {
		mockSearch.current = new URLSearchParams('invited=0&invitesFailed=1');
		const { rerender } = render(<WorkspaceWelcomePage />);
		expect(screen.getByText('workspaceCreation.WELCOME_INVITES_FAILED')).toBeTruthy();

		mockSearch.current = new URLSearchParams('invited=0');
		rerender(<WorkspaceWelcomePage />);
		expect(screen.queryByText('workspaceCreation.WELCOME_INVITES_FAILED')).toBeNull();
		expect(screen.queryByText(/WELCOME_INVITED/)).toBeNull();
	});
});
