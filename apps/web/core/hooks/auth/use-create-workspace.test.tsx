/** @jest-environment jsdom */
/**
 * #5025: how the outcome of a workspace creation is read, and where the new workspace opens. Why a creation failed is
 * said by the page (its notice), never by the generic "That change was not saved" toast on top of it. While it is in
 * flight, the timer does not start.
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { getDefaultStore } from 'jotai';

const mockToastError = jest.fn();
const mockCreateWorkspace = jest.fn();

jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/services/client/api/auth/workspace.service', () => ({
	workspaceService: { createWorkspace: (...args: unknown[]) => mockCreateWorkspace(...args) }
}));

import { MutationErrorToaster } from '@/core/components/common/mutation-error-toaster';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { workspaceOpeningState } from '@/core/stores';
import {
	createWorkspaceCheckoutUrlOf,
	createWorkspaceErrorCodeOf,
	useCreateWorkspace,
	workspaceWelcomePathOf
} from './use-create-workspace';

/** An axios error, as the browser gets it: with the route's answer, or without one. */
const answer = (status: number, data: unknown) => ({
	isAxiosError: true,
	message: 'failed',
	response: { status, data }
});
const unanswered = (code: string, message: string) => ({ isAxiosError: true, code, message });
/** As the app's API client throws it (ApiErrorService.fromAxiosError): the answer's code is its errorCode. */
const thrown = (error: object) => ApiErrorService.fromAxiosError(error);

describe('the outcome of a creation', () => {
	it("reads the route's own reason as it is", () => {
		expect(createWorkspaceErrorCodeOf(answer(403, { code: 'ADDRESS_UNCONFIRMED' }))).toBe('ADDRESS_UNCONFIRMED');
		expect(createWorkspaceErrorCodeOf(answer(403, { code: 'REGISTRATION_CLOSED' }))).toBe('REGISTRATION_CLOSED');
		expect(createWorkspaceErrorCodeOf(answer(403, { code: 'SUBSCRIPTION_REQUIRED' }))).toBe(
			'SUBSCRIPTION_REQUIRED'
		);
		expect(createWorkspaceErrorCodeOf(answer(502, { code: 'CREATED_NOT_OPENED' }))).toBe('CREATED_NOT_OPENED');
		// The route says nothing was set up: a failure to retry
		expect(createWorkspaceErrorCodeOf(answer(502, { code: 'FAILED' }))).toBe('FAILED');
		expect(createWorkspaceErrorCodeOf(thrown(answer(502, { code: 'FAILED' })))).toBe('FAILED');
		expect(createWorkspaceErrorCodeOf(thrown(answer(403, { code: 'REGISTRATION_CLOSED' })))).toBe(
			'REGISTRATION_CLOSED'
		);
	});

	it("reads a server failure that is not the route's own (a gateway's 504) as unknown, a refusal as a failure", () => {
		expect(createWorkspaceErrorCodeOf(thrown(answer(504, '<html>Gateway Time-out</html>')))).toBe(
			'OUTCOME_UNKNOWN'
		);
		expect(createWorkspaceErrorCodeOf(answer(500, { code: 'SOMETHING_ELSE' }))).toBe('OUTCOME_UNKNOWN');
		expect(createWorkspaceErrorCodeOf(thrown(answer(502, {})))).toBe('OUTCOME_UNKNOWN');
		// Refused before anything ran
		expect(createWorkspaceErrorCodeOf(thrown(answer(429, {})))).toBe('FAILED');
		expect(createWorkspaceErrorCodeOf(new Error('A bug before the request'))).toBe('FAILED');
	});

	it("gives the paywall's checkout, an https address only", () => {
		const paywall = (checkoutUrl: string) =>
			thrown(answer(403, { code: 'SUBSCRIPTION_REQUIRED', details: { checkoutUrl } }));
		expect(createWorkspaceCheckoutUrlOf(paywall('https://ever.co/checkout?product=ever-teams'))).toBe(
			'https://ever.co/checkout?product=ever-teams'
		);
		expect(createWorkspaceCheckoutUrlOf(paywall('javascript:alert(1)'))).toBeNull();
		expect(createWorkspaceCheckoutUrlOf(thrown(answer(403, { code: 'SUBSCRIPTION_REQUIRED' })))).toBeNull();
	});

	it('reads a creation the route never answered (a timeout, the network) as an unknown outcome', () => {
		const timeout = unanswered('ECONNABORTED', 'timeout of 120000ms exceeded');
		expect(createWorkspaceErrorCodeOf(timeout)).toBe('OUTCOME_UNKNOWN');
		expect(createWorkspaceErrorCodeOf(thrown(timeout))).toBe('OUTCOME_UNKNOWN');
		expect(createWorkspaceErrorCodeOf(thrown(unanswered('ERR_NETWORK', 'Network Error')))).toBe('OUTCOME_UNKNOWN');
	});

	it('reads a gateway that stopped waiting for the route as an unknown outcome, never as a failure to retry', () => {
		// The ingress, or Cloudflare, gives up while the route may still be creating the workspace
		const ingressTimeout = answer(504, '<html><h1>504 Gateway Time-out</h1></html>');
		expect(createWorkspaceErrorCodeOf(ingressTimeout)).toBe('OUTCOME_UNKNOWN');
		expect(createWorkspaceErrorCodeOf(thrown(ingressTimeout))).toBe('OUTCOME_UNKNOWN');
		expect(createWorkspaceErrorCodeOf(thrown(answer(524, '')))).toBe('OUTCOME_UNKNOWN');
		// The route's own reason still wins
		expect(createWorkspaceErrorCodeOf(answer(504, { code: 'CREATED_NOT_OPENED' }))).toBe('CREATED_NOT_OPENED');
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
		getDefaultStore().set(workspaceOpeningState, false);
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
		mockCreateWorkspace.mockRejectedValue(thrown(answer(403, { code: 'REGISTRATION_CLOSED' })));
		const { result } = renderHook(() => useCreateWorkspace(), { wrapper: withToaster() });

		act(() => result.current.mutate({ name: 'Studio', invites: [] }));

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(createWorkspaceErrorCodeOf(result.current.error)).toBe('REGISTRATION_CLOSED');
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('holds timer starts while the creation is in flight, and releases them when it fails', async () => {
		let refuse: (error: unknown) => void = () => undefined;
		mockCreateWorkspace.mockImplementation(() => new Promise((_resolve, reject) => (refuse = reject)));
		const { result } = renderHook(() => useCreateWorkspace(), { wrapper: withToaster() });

		act(() => result.current.mutate({ name: 'Studio', invites: [] }));
		await waitFor(() => expect(getDefaultStore().get(workspaceOpeningState)).toBe(true));

		act(() => refuse(thrown(answer(502, { code: 'FAILED' }))));
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(getDefaultStore().get(workspaceOpeningState)).toBe(false);
	});

	it('reads the workspace list again when the workspace exists or may: the page sends the person to it', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useCreateWorkspace(), { wrapper });
		const createRefusedWith = async (error: unknown) => {
			mockCreateWorkspace.mockRejectedValueOnce(error);
			await act(async () => {
				await result.current.mutateAsync({ name: 'Studio', invites: [] }).catch(() => undefined);
			});
		};

		await createRefusedWith(thrown(answer(502, { code: 'CREATED_NOT_OPENED' })));
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspaces'] });

		invalidate.mockClear();
		await createRefusedWith(thrown(unanswered('ECONNABORTED', 'timeout of 120000ms exceeded')));
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspaces'] });

		// Not created: the list has nothing new
		invalidate.mockClear();
		await createRefusedWith(thrown(answer(502, { code: 'FAILED' })));
		expect(invalidate).not.toHaveBeenCalled();
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
