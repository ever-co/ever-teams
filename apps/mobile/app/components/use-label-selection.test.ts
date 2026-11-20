import { act, renderHook } from '@testing-library/react-native';
import { toggledLabels, useLabelSelection } from './use-label-selection';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';

const PAINT = { id: 'paint', name: 'Paint' } as ITaskLabelItem;
const OUTDOOR = { id: 'outdoor', name: 'Outdoor' } as ITaskLabelItem;
const NIGHT = { id: 'night', name: 'Night shift' } as ITaskLabelItem;

/** A save the test finishes by hand, in the order it chooses. */
function heldSaves() {
	const calls: { labels: string[]; finish: (saved: boolean) => void }[] = [];
	const save = (labels: ITaskLabelItem[]) =>
		new Promise<boolean>((resolve) => {
			calls.push({ labels: labels.map((label) => label.id), finish: resolve });
		});
	return { calls, save };
}

describe("a task's labels saved from the menu", () => {
	it('writes one at a time, the latest selection last, so quick taps never overwrite each other', async () => {
		const { calls, save } = heldSaves();
		const { result } = await renderHook(() => useLabelSelection([PAINT], save));

		await act(async () => result.current.toggle(OUTDOOR));
		await act(async () => result.current.toggle(NIGHT));

		expect(calls.map((call) => call.labels)).toEqual([['paint', 'outdoor']]);
		expect(result.current.selectedLabels.map((label) => label.id)).toEqual(['paint', 'outdoor', 'night']);

		await act(async () => calls[0].finish(true));

		expect(calls.map((call) => call.labels)).toEqual([
			['paint', 'outdoor'],
			['paint', 'outdoor', 'night']
		]);
	});

	it('keeps a selection still being saved when the menu opens again', async () => {
		const { calls, save } = heldSaves();
		const { result } = await renderHook(() => useLabelSelection([PAINT], save));

		await act(async () => result.current.toggle(OUTDOOR));
		await act(async () => result.current.startFrom([PAINT]));

		expect(result.current.selectedLabels.map((label) => label.id)).toEqual(['paint', 'outdoor']);

		await act(async () => calls[0].finish(true));
		await act(async () => result.current.startFrom([PAINT, OUTDOOR, NIGHT]));

		expect(result.current.selectedLabels.map((label) => label.id)).toEqual(['paint', 'outdoor', 'night']);
	});

	it('gives back the labels last saved when a write fails, and drops the taps waiting behind it', async () => {
		const { calls, save } = heldSaves();
		const { result } = await renderHook(() => useLabelSelection([PAINT], save));

		await act(async () => result.current.toggle(OUTDOOR));
		await act(async () => result.current.toggle(NIGHT));
		await act(async () => calls[0].finish(false));

		expect(result.current.selectedLabels.map((label) => label.id)).toEqual(['paint']);
		expect(calls).toHaveLength(1);
	});

	it('keeps each write on the task it was made for, and drops what waited when the task changes', async () => {
		const { calls, save } = heldSaves();
		const { result, rerender } = await renderHook(
			({ saved, taskKey }: { saved: ITaskLabelItem[]; taskKey: string }) =>
				useLabelSelection(saved, save, taskKey),
			{ initialProps: { saved: [PAINT], taskKey: 'task-a' } }
		);

		await act(async () => result.current.toggle(OUTDOOR));
		await act(async () => result.current.toggle(NIGHT));
		await rerender({ saved: [], taskKey: 'task-b' });

		expect(result.current.selectedLabels).toEqual([]);

		await act(async () => calls[0].finish(false));

		expect(calls).toHaveLength(1);
		expect(result.current.selectedLabels).toEqual([]);
	});

	it("never sends a selection made for one task through the next task's save", async () => {
		const taskA = heldSaves();
		const taskB = heldSaves();
		const { result, rerender } = await renderHook(
			({ saved, taskKey, save }: { saved: ITaskLabelItem[]; taskKey: string; save: typeof taskA.save }) =>
				useLabelSelection(saved, save, taskKey),
			{ initialProps: { saved: [PAINT], taskKey: 'task-a', save: taskA.save } }
		);

		await act(async () => result.current.toggle(OUTDOOR));
		await act(async () => result.current.toggle(NIGHT));
		await rerender({ saved: [OUTDOOR], taskKey: 'task-b', save: taskB.save });
		await act(async () => taskA.calls[0].finish(true));

		expect(taskA.calls.map((call) => call.labels)).toEqual([['paint', 'outdoor']]);
		expect(taskB.calls).toHaveLength(0);
		expect(result.current.selectedLabels.map((label) => label.id)).toEqual(['outdoor']);

		await act(async () => result.current.toggle(PAINT));

		expect(taskB.calls.map((call) => call.labels)).toEqual([['outdoor', 'paint']]);
	});
});

describe('a label tapped in the menu', () => {
	it('joins the labels the task holds, or leaves them when it was there', () => {
		expect(toggledLabels([PAINT], OUTDOOR).map((label) => label.id)).toEqual(['paint', 'outdoor']);
		expect(toggledLabels([PAINT, OUTDOOR], PAINT).map((label) => label.id)).toEqual(['outdoor']);
	});
});
