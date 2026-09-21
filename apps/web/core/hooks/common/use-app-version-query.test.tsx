/** @jest-environment jsdom */

import React, { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppVersionQuery } from './use-app-version-query';

const mockGetVersion = jest.fn();

jest.mock('@/core/services/client/api/app-version.service', () => ({
	appVersionService: {
		getVersion: () => mockGetVersion()
	}
}));

function createWrapper(queryClient: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	};
}

describe('useAppVersionQuery', () => {
	beforeEach(() => {
		mockGetVersion.mockResolvedValue({
			name: 'api',
			version: '0.1.0',
			commit: '63cb7a951107b2ab44d98617358c682bf9560eb8'
		});
	});

	it('caches the public API build identity across footer remounts', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = createWrapper(queryClient);
		const first = renderHook(() => useAppVersionQuery(), { wrapper });

		await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
		first.unmount();

		const second = renderHook(() => useAppVersionQuery(), { wrapper });
		await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

		expect(mockGetVersion).toHaveBeenCalledTimes(1);
		second.unmount();
		queryClient.clear();
	});
});
