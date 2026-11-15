/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useSharedReportToken } from './use-shared-report-token';

describe('useSharedReportToken', () => {
	afterEach(() => {
		window.history.replaceState(null, '', '/');
	});

	it('reads the token from the fragment of the address, the part no server receives', () => {
		window.history.replaceState(null, '', '/fr/shared-report#token=gsr_token-1');

		const { result } = renderHook(() => useSharedReportToken());

		expect(result.current).toBe('gsr_token-1');
	});

	it('reads an empty token from an address without one', () => {
		window.history.replaceState(null, '', '/shared-report');

		const { result } = renderHook(() => useSharedReportToken());

		expect(result.current).toBe('');
	});

	it('follows the fragment when another link is opened in the same tab', () => {
		window.history.replaceState(null, '', '/shared-report#token=gsr_token-1');
		const { result } = renderHook(() => useSharedReportToken());

		act(() => {
			window.history.replaceState(null, '', '/shared-report#token=gsr_token-2');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		expect(result.current).toBe('gsr_token-2');
	});
});
