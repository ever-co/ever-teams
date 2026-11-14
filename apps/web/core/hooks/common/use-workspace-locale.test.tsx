/** @jest-environment jsdom */

import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { currentOrganizationState } from '@/core/stores/user/user-organizations';

jest.mock('next-intl', () => ({ useLocale: () => 'fr' }));

import { useWorkspaceLocale } from './use-workspace-locale';

function renderWorkspaceLocale(organization: object | null) {
	const store = createStore();
	store.set(currentOrganizationState, organization as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useWorkspaceLocale(), { wrapper });
	return { view, store };
}

const READER_WAY = { tag: 'fr', dateFormat: null, numberFormat: null, clock: null, currencyPosition: null };

describe('useWorkspaceLocale', () => {
	it('gives the clock and the side of the currency sign the organization stores', () => {
		const { view } = renderWorkspaceLocale({ id: 'organization-a', timeFormat: 24, currencyPosition: 'RIGHT' });

		expect(view.result.current).toEqual({ ...READER_WAY, clock: 24, currencyPosition: 'RIGHT' });
	});

	it("gives the reader's language with the formats the organization stores", () => {
		const { view } = renderWorkspaceLocale({
			id: 'organization-a',
			dateFormat: 'DD/MM/YYYY',
			numberFormat: '1 234,56'
		});

		expect(view.result.current).toEqual({
			tag: 'fr',
			dateFormat: 'DD/MM/YYYY',
			numberFormat: '1 234,56',
			clock: null,
			currencyPosition: null
		});
	});

	it("leaves the reader with their language's own way until the organization is read, or stores no format", () => {
		const withoutOrganization = renderWorkspaceLocale(null);
		const withoutFormats = renderWorkspaceLocale({ id: 'organization-a', dateFormat: 'LL', numberFormat: null });

		expect(withoutOrganization.view.result.current).toEqual(READER_WAY);
		expect(withoutFormats.view.result.current).toEqual(READER_WAY);
	});

	it('follows a format saved while the report is open, and keeps its identity when another field changes', () => {
		const organization = { id: 'organization-a', name: 'Acme', dateFormat: null, numberFormat: null };
		const { view, store } = renderWorkspaceLocale(organization);
		const first = view.result.current;

		act(() => {
			store.set(currentOrganizationState, { ...organization, name: 'Acme Labs' } as never);
		});
		expect(view.result.current).toBe(first);

		act(() => {
			store.set(currentOrganizationState, { ...organization, dateFormat: 'YYYY-MM-DD' } as never);
		});
		expect(view.result.current).toEqual({ ...READER_WAY, dateFormat: 'YYYY-MM-DD' });
	});
});
