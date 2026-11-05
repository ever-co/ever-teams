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
	afterEach(() => {
		delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
	});

	it('passes the typed code on where the browser has no Web Animations API', () => {
		stubReducedMotion(false);
		const onChange = jest.fn();
		const slots = renderCodeField(onChange);

		fireEvent.change(slots[0], { target: { value: 'a' } });

		expect(onChange).toHaveBeenLastCalledWith('A');
	});

	it('settles the slot the person typed in, even after an empty one', () => {
		stubReducedMotion(false);
		const animate = jest.fn();
		Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
		const slots = renderCodeField(jest.fn());

		fireEvent.input(slots[0], { target: { value: 'a' } });
		fireEvent.input(slots[2], { target: { value: 'c' } });

		expect(animate.mock.contexts).toEqual([slots[0], slots[2]]);
	});

	it('settles the last filled slot after a paste', () => {
		stubReducedMotion(false);
		const animate = jest.fn();
		Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
		const slots = renderCodeField(jest.fn());

		fireEvent.paste(slots[0], { clipboardData: { getData: () => 'ABC' } });

		expect(animate.mock.contexts).toEqual([slots[2]]);
	});
});
