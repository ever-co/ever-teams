/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthField, PasswordField } from './auth-field';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

describe('AuthField', () => {
	it('announces an error as soon as it shows', () => {
		render(<AuthField id="email" label="E-mail" error="Enter a valid email address." />);

		const error = screen.getByRole('alert');
		expect(error.textContent).toBe('Enter a valid email address.');
		expect(screen.getByLabelText('E-mail').getAttribute('aria-describedby')).toBe(error.id);
	});
});

describe('PasswordField', () => {
	it('names the reveal button after its next action, without a pressed state on top', () => {
		render(<PasswordField id="password" label="Password" />);

		const reveal = screen.getByRole('button', { name: 'auth.field.SHOW_PASSWORD' });
		expect(reveal.hasAttribute('aria-pressed')).toBe(false);

		fireEvent.click(reveal);

		expect(reveal.getAttribute('aria-label')).toBe('auth.field.HIDE_PASSWORD');
		expect(reveal.hasAttribute('aria-pressed')).toBe(false);
		expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
	});
});
