import { act, renderHook } from '@testing-library/react-native';
import { useLanguageStarted } from './use-language-started';

let mockLanguageStarted: Promise<void> = Promise.resolve();
jest.mock('./i18n', () => ({
	get languageStarted() {
		return mockLanguageStarted;
	}
}));

describe('the language at start', () => {
	it('holds the first screen until the language shows', async () => {
		let finishStart: () => void = () => undefined;
		mockLanguageStarted = new Promise<void>((resolve) => {
			finishStart = resolve;
		});
		const { result } = await renderHook(() => useLanguageStarted());
		expect(result.current).toBe(false);

		await act(async () => {
			finishStart();
		});

		expect(result.current).toBe(true);
	});

	it('lets the app show when the language could not start', async () => {
		let failStart: (error: Error) => void = () => undefined;
		mockLanguageStarted = new Promise<void>((_resolve, reject) => {
			failStart = reject;
		});
		const { result } = await renderHook(() => useLanguageStarted());

		await act(async () => {
			failStart(new Error('storage unavailable'));
		});

		expect(result.current).toBe(true);
	});
});
