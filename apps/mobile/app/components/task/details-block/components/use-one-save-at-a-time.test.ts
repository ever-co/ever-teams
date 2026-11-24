import { act, renderHook } from '@testing-library/react-native';
import { useOneSaveAtATime } from './use-one-save-at-a-time';

/** A save that waits for the test to answer it. */
function pendingSave() {
	let answer: (saved: boolean) => void = () => undefined;
	const save = jest.fn(
		() =>
			new Promise<boolean>((resolve) => {
				answer = resolve;
			})
	);
	return { save, answer: (saved: boolean) => answer(saved) };
}

describe('one save at a time', () => {
	it('does not run a save asked while another is pending, and runs the next one once it answered', async () => {
		const { result } = await renderHook(() => useOneSaveAtATime());
		const first = pendingSave();
		const second = jest.fn(async () => true);

		let firstRun: Promise<boolean | undefined> = Promise.resolve(undefined);
		await act(async () => {
			firstRun = result.current.runAlone(first.save);
		});
		let secondAnswer: boolean | undefined = true;
		await act(async () => {
			secondAnswer = await result.current.runAlone(second);
		});

		expect(second).not.toHaveBeenCalled();
		expect(secondAnswer).toBeUndefined();
		expect(result.current.isSaving).toBe(true);

		await act(async () => {
			first.answer(true);
			await firstRun;
		});
		expect(result.current.isSaving).toBe(false);

		await act(async () => {
			await result.current.runAlone(second);
		});
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('lets the next save run after one failed', async () => {
		const { result } = await renderHook(() => useOneSaveAtATime());
		const failing = jest.fn(async () => {
			throw new Error('offline');
		});

		await act(async () => {
			await result.current.runAlone(failing).catch(() => undefined);
		});
		expect(result.current.isSaving).toBe(false);

		const next = jest.fn(async () => true);
		await act(async () => {
			await result.current.runAlone(next);
		});
		expect(next).toHaveBeenCalledTimes(1);
	});
});
