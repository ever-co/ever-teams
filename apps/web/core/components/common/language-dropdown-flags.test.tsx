/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockFetchLanguages = jest.fn();
const mockUseLanguageSettings = jest.fn();

jest.mock('@/core/constants/config/constants', () => ({
	FAST_APP_BOOTSTRAP: { value: true },
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
	return {
		Select: ({ children, onOpenChange, open }: any) => {
			const [internalOpen, setInternalOpen] = ActualReact.useState(false);
			const visible = open ?? internalOpen;
			return (
				<>
					<button
						type="button"
						onClick={() => {
							if (open === undefined) setInternalOpen(true);
							onOpenChange?.(true);
						}}
					>
						Open language
					</button>
					{visible ? <div role="listbox">{children}</div> : null}
				</>
			);
		},
		SelectTrigger: ({ children }: any) => <>{children}</>,
		SelectContent: ({ children }: any) => <>{children}</>,
		SelectItem: ({ children }: any) => <div role="option">{children}</div>
	};
});

import { LanguageDropDownWithFlags } from './language-dropdown-flags';

describe('LanguageDropDownWithFlags deferred fast loading', () => {
	it('loads exactly once on an early open and never exposes an empty interactive menu', async () => {
		type Language = { code: string; id: string; name: string };
		let resolveLanguages!: (languages: Language[]) => void;
		const pendingLanguages = new Promise<Language[]>((resolve) => {
			resolveLanguages = resolve;
		});
		mockFetchLanguages.mockReturnValue(pendingLanguages);
		mockUseLanguageSettings.mockImplementation(({ enabled }: { enabled?: boolean }) => {
			const [languages, setLanguages] = React.useState<Language[]>([]);
			React.useEffect(() => {
				if (!enabled) return;
				let active = true;
				void mockFetchLanguages().then((nextLanguages: Language[]) => {
					if (active) setLanguages(nextLanguages);
				});
				return () => {
					active = false;
				};
			}, [enabled]);
			return {
				languages,
				loadLanguagesData: mockFetchLanguages,
				setActiveLanguage: jest.fn()
			};
		});

		render(<LanguageDropDownWithFlags deferFastBootstrap />);
		expect(mockFetchLanguages).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Open language' }));
		expect(mockFetchLanguages).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('listbox')).toBeNull();

		await act(async () => {
			resolveLanguages([{ code: 'en', id: 'language-en', name: 'English' }]);
			await pendingLanguages;
		});

		await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeNull());
		expect(screen.getAllByRole('option')).toHaveLength(1);
		expect(mockFetchLanguages).toHaveBeenCalledTimes(1);
	});
});
