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

	beforeEach(() => {
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			value: (query: string) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() })
		});
	});

	afterEach(() => {
		prototype.animate = originalAnimate;
	});

	it('appears without its arrival where the Web Animations API is missing', () => {
		delete prototype.animate;
		expect(() => render(<ToastOrb tone="error" />)).not.toThrow();
	});

	it('plays its arrival once where the API is there', () => {
		const animate = jest.fn();
		prototype.animate = animate;
		render(<ToastOrb tone="success" />);
		expect(animate).toHaveBeenCalledTimes(1);
	});
});
