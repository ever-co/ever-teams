/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { TLanguageItemList } from '@/core/types/schemas';
import { useLanguageStateSync } from './use-language-state-sync';

describe('useLanguageStateSync loading ownership', () => {
	it('keeps shared loading true while another mounted consumer still owns the request', () => {
		const query = {
			data: undefined,
			isLoading: true
		} as UseQueryResult<PaginationResponse<TLanguageItemList>, Error>;
		let sharedLoading = false;
		const setLanguages = jest.fn();
		const firstSetter = (loading: boolean) => {
			sharedLoading = loading;
		};
		const secondSetter = (loading: boolean) => {
			sharedLoading = loading;
		};

		const first = renderHook(() => useLanguageStateSync(query, setLanguages, firstSetter));
		const second = renderHook(() => useLanguageStateSync(query, setLanguages, secondSetter));
		expect(sharedLoading).toBe(true);

		first.unmount();
		expect(sharedLoading).toBe(true);

		second.unmount();
		expect(sharedLoading).toBe(false);
	});
});
