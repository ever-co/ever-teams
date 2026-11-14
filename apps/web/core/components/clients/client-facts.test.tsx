/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TClient } from '@/core/types/schemas';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/components/icons', () => ({
	Copy: () => null,
	Mail: () => null,
	Pencil: () => null,
	Phone: () => null,
	Plus: () => null
}));

import { ClientFacts } from './client-facts';

const CLAMP = 'line-clamp-4';
const FULL_HEIGHT = 120;
const CLAMPED_HEIGHT = 60;

/** jsdom has no layout: the notes run to 120px, of which the four-line clamp shows 60. */
function layOutNotes() {
	Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
		configurable: true,
		get() {
			return FULL_HEIGHT;
		}
	});
	Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
		configurable: true,
		get(this: HTMLElement) {
			if (this.classList.contains(CLAMP)) {
				return CLAMPED_HEIGHT;
			}
			return FULL_HEIGHT;
		}
	});
}

function clientWithNotes(notes: string) {
	return { id: 'client-acme', name: 'Acme', notes } as TClient;
}

function renderFacts(client: TClient) {
	return (
		<ClientFacts client={client} terms={{ kind: 'receipt' }} canEdit={false} onEdit={jest.fn()} framed={false} />
	);
}

describe('ClientFacts notes', () => {
	beforeAll(layOutNotes);

	it('keeps "Show less" able to come back after notes edited while expanded', () => {
		const view = render(renderFacts(clientWithNotes('A long note that runs past four lines.')));
		fireEvent.click(screen.getByText('clients.notes.READ_MORE'));

		view.rerender(renderFacts(clientWithNotes('A long note that runs past four lines, edited.')));
		fireEvent.click(screen.getByText('clients.notes.SHOW_LESS'));

		expect(screen.getByText('clients.notes.READ_MORE')).toBeTruthy();
	});
});
