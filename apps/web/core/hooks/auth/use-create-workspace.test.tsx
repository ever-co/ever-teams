/** @jest-environment jsdom */
/**
 * #5025: how the outcome of a workspace creation is read, and where the new workspace opens. Why a creation failed is
 * said by the page (its notice), never by the generic "That change was not saved" toast on top of it.
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';

const mockToastError = jest.fn();
const mockCreateWorkspace = jest.fn();

jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/services/client/api/auth/workspace.service', () => ({
	workspaceService: { createWorkspace: (...args: unknown[]) => mockCreateWorkspace(...args) }
}));

import { MutationErrorToaster } from '@/core/components/common/mutation-error-toaster';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { createWorkspaceErrorCodeOf, useCreateWorkspace, workspaceWelcomePathOf } from './use-create-workspace';

describe('the outcome of a creation', () => {
	it("reads the route's reason, and anything else as a failure to retry", () => {
		const answer = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });
		expect(createWorkspaceErrorCodeOf(answer(403, { code: 'ADDRESS_UNCONFIRMED' }))).toBe('ADDRESS_UNCONFIRMED');
		expect(createWorkspaceErrorCodeOf(answer(403, { code: 'REGISTRATION_CLOSED' }))).toBe('REGISTRATION_CLOSED');
		expect(createWorkspaceErrorCodeOf(answer(502, { code: 'FAILED' }))).toBe('FAILED');
		expect(createWorkspaceErrorCodeOf(answer(500, { code: 'SOMETHING_ELSE' }))).toBe('FAILED');
		expect(createWorkspaceErrorCodeOf(new Error('Network Error'))).toBe('FAILED');
		// As the app's API client throws it: the answer's code is its errorCode
		expect(createWorkspaceErrorCodeOf(new ApiErrorService('Forbidden', 403, 'REGISTRATION_CLOSED'))).toBe(
			'REGISTRATION_CLOSED'
		);
		expect(createWorkspaceErrorCodeOf(new ApiErrorService('Bad gateway', 502))).toBe('FAILED');
	});

	it('opens the welcome page of the new workspace, told how the invitations went', () => {
		expect(workspaceWelcomePathOf({ invited: 2, invitesFailed: false })).toBe('/workspace/welcome?invited=2');
		expect(workspaceWelcomePathOf({ invited: 0, invitesFailed: true })).toBe(
			'/workspace/welcome?invited=0&invitesFailed=1'
		);
	});
});

describe('useCreateWorkspace', () => {
	beforeEach(() => {
		mockToastError.mockReset();
		mockCreateWorkspace.mockReset();
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function withToaster() {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		return ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				<MutationErrorToaster />
				{children}
			</QueryClientProvider>
		);
	}

	it('leaves a refused creation to the page: no generic toast on top of its notice', async () => {
		mockCreateWorkspace.mockRejectedValue(new ApiErrorService('Forbidden', 403, 'REGISTRATION_CLOSED'));
		const { result } = renderHook(() => useCreateWorkspace(), { wrapper: withToaster() });

		act(() => result.current.mutate({ name: 'Studio', invites: [] }));

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(createWorkspaceErrorCodeOf(result.current.error)).toBe('REGISTRATION_CLOSED');
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('(control) the generic toast does speak for a mutation that says nothing itself', async () => {
		const { result } = renderHook(
			() => useMutation({ mutationFn: () => Promise.reject(new ApiErrorService('Forbidden', 403)) }),
			{ wrapper: withToaster() }
		);

		act(() => result.current.mutate());

		await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
	});
});
