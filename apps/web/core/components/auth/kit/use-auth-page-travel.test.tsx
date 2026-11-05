/** @jest-environment jsdom */
import { StrictMode, useRef } from 'react';
import { render } from '@testing-library/react';
import { useAuthPageTravel } from './use-auth-page-travel';

const animate = jest.fn();

function AuthPage() {
	const frameRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLDivElement>(null);
	useAuthPageTravel({ frameRef, formRef });
	return (
		<div ref={frameRef}>
			<div ref={formRef} />
		</div>
	);
}

beforeEach(() => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
	Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
});

afterEach(() => {
	delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

describe('useAuthPageTravel', () => {
	it('keeps a first load still in Strict Mode', () => {
		render(
			<StrictMode>
				<AuthPage />
			</StrictMode>
		);

		expect(animate).not.toHaveBeenCalled();
	});

	it('travels when the person moves on from another auth page', () => {
		const leaving = render(<AuthPage />);
		leaving.unmount();
		animate.mockClear();

		render(<AuthPage />);

		expect(animate).toHaveBeenCalledTimes(1);
	});
});
