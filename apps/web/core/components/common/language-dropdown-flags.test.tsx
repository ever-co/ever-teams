/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockFetchLanguages = jest.fn();
const mockUseLanguageSettings = jest.fn();

type Language = { code: string; id: string; name: string };

const english: Language = { code: 'en', id: 'language-en', name: 'English' };

jest.mock('@/core/constants/config/constants', () => ({
	languagesFlags: [{ code: 'en', Flag: () => <span data-testid="english-flag" /> }]
}));
jest.mock('@/core/hooks', () => ({
	useLanguage: () => ({ changeLanguage: jest.fn() }),
	useLanguageSettings: (options: unknown) => mockUseLanguageSettings(options)
}));
jest.mock('@/core/lib/helpers/index', () => ({ setActiveLanguageIdCookie: jest.fn() }));
jest.mock('next/navigation', () => ({
	usePathname: () => '/dashboard',
	useRouter: () => ({ replace: jest.fn() })
}));
jest.mock('react-hook-form', () => ({ useForm: () => ({ setValue: jest.fn() }) }));
jest.mock('@/core/components/common/select', () => {
	const ActualReact = jest.requireActual('react') as typeof React;
	const SelectContext = ActualReact.createContext<{
		open: boolean;
		setOpen: (open: boolean) => void;
	} | null>(null);
	return {
		Select: ({ children, onOpenChange, open }: any) => {
			const [internalOpen, setInternalOpen] = ActualReact.useState(false);
			const visible = open ?? internalOpen;
			const setVisible = (nextOpen: boolean) => {
				if (open === undefined) setInternalOpen(nextOpen);
				onOpenChange?.(nextOpen);
			};
			return (
				<SelectContext.Provider value={{ open: visible, setOpen: setVisible }}>
					{children}
				</SelectContext.Provider>
			);
		},
		SelectTrigger: ({ children, ...props }: any) => {
			const context = ActualReact.useContext(SelectContext);
			return (
				<button type="button" aria-label="Open language" onClick={() => context?.setOpen(true)} {...props}>
					{children}
				</button>
			);
		},
		SelectContent: ({ children }: any) => {
			const context = ActualReact.useContext(SelectContext);
			return context?.open ? <div role="listbox">{children}</div> : null;
		},
		SelectItem: ({ children }: any) => <div role="option">{children}</div>
	};
});

import { LanguageDropDownWithFlags } from './language-dropdown-flags';

describe('LanguageDropDownWithFlags deferred loading', () => {
	beforeEach(() => {
		mockFetchLanguages.mockReset();
		mockUseLanguageSettings.mockReset();
		mockUseLanguageSettings.mockImplementation(({ enabled }: { enabled?: boolean }) => {
			const [languages, setLanguages] = React.useState<Language[]>([]);
			const [loading, setLoading] = React.useState(false);
			const [isError, setIsError] = React.useState(false);
			const fetchLanguages = React.useCallback(async () => {
				setLoading(true);
				setIsError(false);
				try {
					const nextLanguages = (await mockFetchLanguages()) as Language[];
					setLanguages(nextLanguages);
					return { data: { items: nextLanguages, total: nextLanguages.length }, isError: false };
				} catch (error) {
					setLanguages([]);
					setIsError(true);
					return { data: undefined, error, isError: true };
				} finally {
					setLoading(false);
				}
			}, []);

			React.useEffect(() => {
				if (!enabled) return;
				void fetchLanguages();
			}, [enabled, fetchLanguages]);

			return {
				languages,
				loading,
				isError,
				loadLanguagesData: fetchLanguages,
				refetch: fetchLanguages,
				setActiveLanguage: jest.fn()
			};
		});
	});

	it('loads exactly once on an early open and never exposes an empty interactive menu', async () => {
		let resolveLanguages!: (languages: Language[]) => void;
		const pendingLanguages = new Promise<Language[]>((resolve) => {
			resolveLanguages = resolve;
		});
		mockFetchLanguages.mockReturnValue(pendingLanguages);

		render(<LanguageDropDownWithFlags deferLoading />);
		expect(mockFetchLanguages).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Open language' }));
		expect(mockFetchLanguages).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('listbox')).toBeNull();

		await act(async () => {
			resolveLanguages([english]);
			await pendingLanguages;
		});

		await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeNull());
		expect(screen.getAllByRole('option')).toHaveLength(1);
		expect(mockFetchLanguages).toHaveBeenCalledTimes(1);
	});

	it.each(['error', 'empty'] as const)(
		're-enables after an initial %s result and retries exactly once on the next open',
		async (firstResult) => {
			let resolveFirst!: (languages: Language[]) => void;
			let rejectFirst!: (error: Error) => void;
			const firstRequest = new Promise<Language[]>((resolve, reject) => {
				resolveFirst = resolve;
				rejectFirst = reject;
			});
			let resolveRetry!: (languages: Language[]) => void;
			const retryRequest = new Promise<Language[]>((resolve) => {
				resolveRetry = resolve;
			});
			mockFetchLanguages.mockReturnValueOnce(firstRequest).mockReturnValueOnce(retryRequest);

			render(<LanguageDropDownWithFlags deferLoading />);
			const trigger = screen.getByRole('button', { name: 'Open language' });

			expect(mockFetchLanguages).not.toHaveBeenCalled();
			fireEvent.click(trigger);
			expect(mockFetchLanguages).toHaveBeenCalledTimes(1);
			expect((trigger as HTMLButtonElement).disabled).toBe(true);
			expect(screen.queryByRole('listbox')).toBeNull();

			await act(async () => {
				if (firstResult === 'error') rejectFirst(new Error('language request failed'));
				else resolveFirst([]);
				await firstRequest.catch(() => undefined);
			});

			await waitFor(() => expect((trigger as HTMLButtonElement).disabled).toBe(false));
			expect(screen.queryByRole('listbox')).toBeNull();
			expect(mockFetchLanguages).toHaveBeenCalledTimes(1);

			fireEvent.click(trigger);
			await waitFor(() => expect(mockFetchLanguages).toHaveBeenCalledTimes(2));
			expect((trigger as HTMLButtonElement).disabled).toBe(true);
			expect(screen.queryByRole('listbox')).toBeNull();

			await act(async () => {
				resolveRetry([english]);
				await retryRequest;
			});

			await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeNull());
			expect(screen.getAllByRole('option')).toHaveLength(1);
			expect(mockFetchLanguages).toHaveBeenCalledTimes(2);
		}
	);
});
