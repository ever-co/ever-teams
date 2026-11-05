/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import Page from './page';

let mockQuery = '';

jest.mock('next/navigation', () => ({
	useSearchParams: () => new URLSearchParams(mockQuery)
}));
jest.mock('@/core/components/layouts/focus/focus-shell', () => ({
	FocusShell: ({ children }: { children: ReactNode }) => <main>{children}</main>
}));
jest.mock('@/core/components/pages/auth/sign-in-error', () => ({
	SignInError: ({ code }: { code?: string | null }) => <p>sign-in error {code}</p>
}));
jest.mock('@/core/components/pages/unauthorized', () => () => <p>unauthorized</p>);
jest.mock('@/core/components/pages/error/error', () => () => <p>configuration error</p>);
jest.mock('@/core/components/pages/auth/ever-id-no-workspace', () => () => <p>no workspace</p>);
jest.mock('@/core/components/pages/auth/ever-id-verify-email', () => () => <p>verify e-mail</p>);

describe('auth error page', () => {
	it.each(['__proto__', 'toString', 'constructor'])('shows the sign-in error for ?error=%s', (code) => {
		mockQuery = `error=${code}`;

		render(<Page />);

		expect(screen.getByText(`sign-in error ${code}`)).toBeTruthy();
	});

	it('shows the page of a known error', () => {
		mockQuery = 'error=AccessDenied';

		render(<Page />);

		expect(screen.getByText('unauthorized')).toBeTruthy();
	});
});
