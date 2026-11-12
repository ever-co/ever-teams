/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ClientsListState } from '@/core/hooks/clients/use-clients-list-state';
import { ClientsToolbar } from './clients-toolbar';

// The keys stand for the texts, followed by the values they are given
function translate(key: string, values?: Record<string, unknown>) {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

jest.mock('next-intl', () => ({ useTranslations: () => translate }));
jest.mock('@/core/components/common/list-search-field', () => ({ ListSearchField: () => null }));
jest.mock('@/core/components/common/segmented-control', () => ({ SegmentedControl: () => null }));

const list: ClientsListState = { scope: 'active', setScope: jest.fn(), search: '', setSearch: jest.fn() };

function toolbarWith(shownCount: number) {
	return (
		<ClientsToolbar
			list={list}
			counts={{ active: 3, archived: 0 }}
			shownCount={shownCount}
			isLoading={false}
			canCreate={false}
			onCreate={jest.fn()}
		/>
	);
}

describe('the number of clients beside the title of the Clients page', () => {
	it('is announced by screen readers when a search or the scope changes it', () => {
		const { rerender } = render(toolbarWith(3));
		const count = screen.getByText('clients.COUNT {"count":3}');

		expect(count.getAttribute('aria-live')).toBe('polite');

		rerender(toolbarWith(1));

		expect(count.textContent).toBe('clients.COUNT {"count":1}');
	});
});
