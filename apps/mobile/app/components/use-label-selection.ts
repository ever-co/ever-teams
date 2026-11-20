import { useCallback, useEffect, useRef, useState } from 'react';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';

/** The labels with this one added, or taken away when the task already holds it. */
export function toggledLabels(labels: ITaskLabelItem[], label: ITaskLabelItem): ITaskLabelItem[] {
	const isHeld = labels.some((held) => held.id === label.id);
	if (isHeld) {
		return labels.filter((held) => held.id !== label.id);
	}
	return [...labels, label];
}

type LabelSave = (labels: ITaskLabelItem[]) => Promise<boolean>;

/** A selection waiting for its write, and the task it was made for. */
interface QueuedLabels {
	labels: ITaskLabelItem[];
	madeFor: number;
}

/**
 * A task's labels as the menu shows them, saved one write at a time: a tap while a write runs waits for it, and the
 * latest selection is the last one written, so quick taps never overwrite each other. A write that fails gives back
 * the labels last saved, and the taps waiting behind it are dropped. Reopening the menu keeps a selection still being
 * saved. Another task (the timer's active task changing) drops what waited for the previous one, whose write in flight
 * then no longer touches the screen.
 */
export function useLabelSelection(savedLabels: ITaskLabelItem[], save: LabelSave, taskKey?: string) {
	const [selectedLabels, setSelectedLabels] = useState<ITaskLabelItem[]>(savedLabels);
	const selection = useRef<ITaskLabelItem[]>(savedLabels);
	const waiting = useRef<QueuedLabels | null>(null);
	// which task the screen shows: a write made for an earlier one never changes it
	const generation = useRef(0);
	// The task moves on in the very render that brings the new task's save, not in an effect after it: a write that
	// waited for the previous task can then never go out through the new task's save.
	const shownTaskKey = useRef(taskKey);
	if (shownTaskKey.current !== taskKey) {
		shownTaskKey.current = taskKey;
		generation.current += 1;
		waiting.current = null;
	}
	const latestSavedLabels = useRef<ITaskLabelItem[]>(savedLabels);
	latestSavedLabels.current = savedLabels;
	const lastSaved = useRef<ITaskLabelItem[]>(savedLabels);
	const isSaving = useRef(false);
	// the latest save, so a write that waited sends the task as it is now
	const latestSave = useRef<LabelSave>(save);
	latestSave.current = save;

	const show = useCallback((labels: ITaskLabelItem[]) => {
		selection.current = labels;
		setSelectedLabels(labels);
	}, []);

	const saveInTurn = useCallback(async () => {
		isSaving.current = true;
		while (waiting.current) {
			const { labels, madeFor } = waiting.current;
			waiting.current = null;
			if (madeFor !== generation.current) {
				continue;
			}
			// one write at a time is the point: the latest selection must be the last one the API gets
			const isSaved = await latestSave.current(labels); // NOSONAR
			const isForAnotherTask = madeFor !== generation.current;
			if (isForAnotherTask) {
				continue;
			}
			if (isSaved) {
				lastSaved.current = labels;
			} else {
				waiting.current = null;
				show(lastSaved.current);
			}
		}
		isSaving.current = false;
	}, [show]);

	const toggle = useCallback(
		(label: ITaskLabelItem) => {
			const nextLabels = toggledLabels(selection.current, label);
			show(nextLabels);
			waiting.current = { labels: nextLabels, madeFor: generation.current };
			if (!isSaving.current) {
				void saveInTurn();
			}
		},
		[saveInTurn, show]
	);

	// the new task's labels on screen; what waited for the previous task was dropped in the render above
	useEffect(() => {
		lastSaved.current = latestSavedLabels.current;
		show(latestSavedLabels.current);
	}, [taskKey, show]);

	/** Where the menu starts when it opens: the labels the task holds, unless a selection is still being saved. */
	const startFrom = useCallback(
		(labels: ITaskLabelItem[]) => {
			if (isSaving.current) {
				return;
			}
			lastSaved.current = labels;
			show(labels);
		},
		[show]
	);

	return { selectedLabels, toggle, startFrom };
}
