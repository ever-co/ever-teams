/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Container } from './container';

describe('Container', () => {
	it('renders page content as a fluid region with responsive horizontal padding', () => {
		render(
			<Container>
				<div data-testid="content">Content</div>
			</Container>
		);

		const container = screen.getByTestId('content').parentElement;

		expect(container).not.toBeNull();
		expect(container?.classList.contains('w-full')).toBe(true);
		expect(container?.classList.contains('px-4')).toBe(true);
		expect(container?.classList.contains('x-container')).toBe(false);
	});
});
