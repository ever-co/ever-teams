/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { UserReadFailedState } from './user-read-failed-state';

const mockPageLayout = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ title, children }: { title?: string; children: ReactNode }) => {
		mockPageLayout(title);
		return <div>{children}</div>;
	}
}));

describe('UserReadFailedState', () => {
	beforeEach(() => {
		mockPageLayout.mockReset();
	});

	it('names the page that could not load and why, in the tab title too', () => {
		render(<UserReadFailedState error={new ApiErrorService('Service unavailable', 503)} onRetry={jest.fn()} />);

		expect(screen.getByText('pages.error.PAGE_NOT_LOADED')).toBeTruthy();
		expect(screen.getByText('toasts.REASONS.SERVER')).toBeTruthy();
		expect(mockPageLayout).toHaveBeenCalledWith('pages.error.PAGE_NOT_LOADED');
	});

	it('says the server could not complete it when the read got no answer in time', () => {
		render(<UserReadFailedState error={new ApiErrorService('Connection Aborted', 408)} onRetry={jest.fn()} />);

		expect(screen.getByText('toasts.REASONS.SERVER')).toBeTruthy();
	});

	it('says the person is offline when the browser has no network', () => {
		const onLine = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

		render(<UserReadFailedState error={new ApiErrorService('Network Error', 503)} onRetry={jest.fn()} />);

		expect(screen.getByText('toasts.REASONS.OFFLINE')).toBeTruthy();
		onLine.mockRestore();
	});

	it('keeps the reason while the read is asked again', () => {
		const view = render(
			<UserReadFailedState error={new ApiErrorService('Service unavailable', 503)} onRetry={jest.fn()} />
		);

		view.rerender(<UserReadFailedState error={null} onRetry={jest.fn()} />);

		expect(screen.getByText('toasts.REASONS.SERVER')).toBeTruthy();
	});

	it('reads the user again on Try again', () => {
		const onRetry = jest.fn();
		render(<UserReadFailedState error={new ApiErrorService('Service unavailable', 503)} onRetry={onRetry} />);

		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));

		expect(onRetry).toHaveBeenCalledTimes(1);
	});
});
