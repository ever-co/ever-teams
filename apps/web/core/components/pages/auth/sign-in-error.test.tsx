/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { SignInError } from './sign-in-error';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) => {
		if (values?.code) {
			return `${key} ${values.code}`;
		}
		return key;
	}
}));
jest.mock('@/core/components/common/toast-orb', () => ({
	ToastOrb: () => <span />
}));
jest.mock('@/core/components/pages/error/system-page-frame', () => ({
	SystemPageFrame: ({ children }: { children: ReactNode }) => <main>{children}</main>,
	SYSTEM_PAGE_TEXT_CLASS: '',
	SYSTEM_PAGE_TITLE_CLASS: ''
}));

describe('SignInError', () => {
	it('shows the code next-auth sent', () => {
		render(<SignInError code="OAuthCallback" />);

		expect(screen.getByText('auth.error.CODE OAuthCallback')).toBeTruthy();
	});

	it('shows no text a link made up', () => {
		render(<SignInError code="Your account is locked, call +1 555 0100" />);

		expect(screen.queryByText(/auth\.error\.CODE/)).toBeNull();
		expect(screen.queryByText(/call/)).toBeNull();
	});
});
