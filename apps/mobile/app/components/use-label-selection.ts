import { useCallback, useRef, useState } from 'react';
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

/**
 * A task's labels as the menu shows them, saved one write at a time: a tap while a write runs waits for it, and the
 * latest selection is the last one written, so quick taps never overwrite each other. A write that fails gives back
 * the labels last saved, and the taps waiting behind it are dropped. Reopening the menu keeps a selection still being
 * saved.
 */
export function useLabelSelection(savedLabels: ITaskLabelItem[], save: LabelSave) {
	const [selectedLabels, setSelectedLabels] = useState<ITaskLabelItem[]>(savedLabels);
	const selection = useRef<ITaskLabelItem[]>(savedLabels);
	const waiting = useRef<ITaskLabelItem[] | null>(null);
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
			const labels = waiting.current;
			waiting.current = null;
			const isSaved = await latestSave.current(labels);
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
			waiting.current = nextLabels;
			if (!isSaving.current) {
				void saveInTurn();
			}
		},
		[saveInTurn, show]
	);

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
