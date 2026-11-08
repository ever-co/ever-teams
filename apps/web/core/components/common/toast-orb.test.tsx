/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('@/core/components/icons', () => {
	const Glyph = () => null;
	return { Alert: Glyph, Check: Glyph, Info: Glyph, Loader: Glyph, X: Glyph };
});

import { ToastOrb } from './toast-orb';

describe('ToastOrb', () => {
	const prototype = HTMLElement.prototype as unknown as { animate?: unknown };
	const originalAnimate = prototype.animate;
	const prefersReducedMotion = (reduce: boolean) =>
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			value: (query: string) => ({ matches: reduce, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() })
		});

	beforeEach(() => prefersReducedMotion(false));

	afterEach(() => {
		prototype.animate = originalAnimate;
	});

	it('appears without its arrival where the Web Animations API is missing', () => {
		delete prototype.animate;
		const { container } = render(<ToastOrb tone="error" />);
		const orb = container.querySelector('span[aria-hidden="true"]') as HTMLElement | null;
		expect(orb).not.toBeNull();
		expect(orb?.style.getPropertyValue('--orb')).toBe('hsl(var(--destructive))');
		expect(orb?.querySelector('span')).not.toBeNull();
	});

	it('plays its arrival once where the API is there', () => {
		const animate = jest.fn();
		prototype.animate = animate;
		render(<ToastOrb tone="success" />);
		expect(animate).toHaveBeenCalledTimes(1);
	});

	it('plays no arrival when the person asks for reduced motion', () => {
		const animate = jest.fn();
		prototype.animate = animate;
		prefersReducedMotion(true);
		render(<ToastOrb tone="success" />);
		expect(animate).not.toHaveBeenCalled();
	});
});
