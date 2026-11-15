/** @jest-environment jsdom */
import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockToastError = jest.fn();
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { MutationErrorToaster } from './mutation-error-toaster';

const CHALLENGE = {
	isApiError: true,
	statusCode: 403,
	errorCode: 'TWO_FACTOR_REQUIRED',
	details: { challenge: 'signed.challenge', expiresAt: '2026-11-14T12:05:00.000Z' }
};

async function failMutation(error: unknown) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	render(
		<QueryClientProvider client={client}>
			<MutationErrorToaster />
		</QueryClientProvider>
	);
	const mutation = client.getMutationCache().build(client, { mutationFn: () => Promise.reject(error) });
	await act(async () => {
		await mutation.execute(undefined).catch(() => undefined);
	});
}

describe('MutationErrorToaster', () => {
	beforeEach(() => mockToastError.mockClear());

	it('says a mutation failed when nobody else does', async () => {
		await failMutation({ isApiError: true, statusCode: 500 });

		expect(mockToastError).toHaveBeenCalledWith('toasts.MUTATION_FAILED', expect.anything());
	});

	it('stays silent on a two-factor challenge: the page asks for the code instead', async () => {
		await failMutation(CHALLENGE);

		expect(mockToastError).not.toHaveBeenCalled();
	});
});
