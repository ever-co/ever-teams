/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthCodeField } from './auth-code-field';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

function stubReducedMotion(reduces: boolean) {
	window.matchMedia = jest.fn().mockReturnValue({ matches: reduces }) as unknown as typeof window.matchMedia;
}

function renderCodeField(onChange: (code: string) => void) {
	render(<AuthCodeField id="code" label="Sign-in code" status="idle" autoFocus={false} onChange={onChange} />);
	return screen.getAllByRole('textbox') as HTMLInputElement[];
}

describe('AuthCodeField', () => {
	it('passes the typed code on where the browser has no Web Animations API', () => {
		stubReducedMotion(false);
		const onChange = jest.fn();
		const slots = renderCodeField(onChange);

		fireEvent.change(slots[0], { target: { value: 'a' } });

		expect(onChange).toHaveBeenLastCalledWith('A');
	});
});
