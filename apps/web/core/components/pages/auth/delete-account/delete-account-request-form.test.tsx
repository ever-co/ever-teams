/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DeleteAccountRequestForm from './delete-account-request-form';

const mockRequestLink = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/components/layouts/default-layout/auth-layout', () => ({
	AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/hooks/auth/use-account-deletion', () => ({
	useAccountDeletionRequest: () => ({ requestLink: mockRequestLink, loading: false, sent: false, error: false })
}));

beforeEach(() => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
});

function emailField() {
	return screen.getByLabelText('auth.field.EMAIL_LABEL');
}

async function submit() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'pages.accountDeletion.SEND_LINK' }));
	});
}

describe('DeleteAccountRequestForm', () => {
	it('asks for a valid address before sending anything', async () => {
		render(<DeleteAccountRequestForm />);
		fireEvent.change(emailField(), { target: { value: 'foo' } });

		await submit();

		expect(screen.getByRole('alert').textContent).toBe('auth.field.EMAIL_INVALID');
		expect(mockRequestLink).not.toHaveBeenCalled();
	});

	it('clears the required error once an address is typed', async () => {
		render(<DeleteAccountRequestForm />);
		await submit();
		expect(screen.getByRole('alert').textContent).toBe('form.EMAIL_REQUIRED');

		fireEvent.change(emailField(), { target: { value: 'a' } });

		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('sends the link to a valid address', async () => {
		render(<DeleteAccountRequestForm />);
		fireEvent.change(emailField(), { target: { value: 'alice@example.com' } });

		await submit();

		expect(mockRequestLink).toHaveBeenCalledWith('alice@example.com');
	});
});
