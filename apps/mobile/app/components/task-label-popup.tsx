import React, { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskLabels } from '../services/hooks/features/use-task-labels';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';
import { translate } from '../i18n';
import { useWebTheme } from '../theme';
import TaskLabelForm from '../screens/authenticated/task-label-screen/components/task-label-form';
import { PickerCreateFooter, PickerOption, PropertyPicker } from './property-picker';
import { PropertyMenuAction } from './property-menu';
import { Plus } from '../../src/components/icons';
import type { MenuRect } from '../../src/components/menu-placement';
import { MENU_ICON_SIZE } from '../../src/theme/menu-look';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	/** The labels the task holds now. */
	selectedLabels: ITaskLabelItem[];
	/** Adds a label the task does not hold, or takes away one it holds: the menu stays open for the next one. */
	onToggleLabel: (label: ITaskLabelItem) => unknown;
	canCreateLabel?: boolean;
	/** The chip the labels open from, so they show in the web's menu under it. */
	anchor?: MenuRect | null;
}

/** The labels with this one added, or taken away when the task already holds it. */
export function toggledLabels(labels: ITaskLabelItem[], label: ITaskLabelItem): ITaskLabelItem[] {
	const isHeld = labels.some((held) => held.id === label.id);
	if (isHeld) {
		return labels.filter((held) => held.id !== label.id);
	}
	return [...labels, label];
}

/** The form opened here only creates a label: it never updates one. */
function keepLabelUnchanged() {
	return undefined;
}

/** A label as a row: its dot in its color and its name as it was saved, checked when the task holds it. */
function labelOptionOf(label: ITaskLabelItem, selectedLabels: ITaskLabelItem[]): PickerOption {
	return {
		key: label.id,
		name: label.name ?? '',
		color: label.color,
		iconUrl: label.fullIconUrl,
		kind: 'label',
		isSelected: selectedLabels.some((held) => held.id === label.id)
	};
}

interface ILabelCreateFooter {
	anchored: boolean;
	onPress: () => void;
}

/** Creating a label from the picker: the menu's action row, or the dialog's button. The API decides who may. */
function LabelCreateFooter({ anchored, onPress }: Readonly<ILabelCreateFooter>) {
	const theme = useWebTheme();
	if (anchored) {
		return (
			<PropertyMenuAction
				icon={<Plus size={MENU_ICON_SIZE} color={theme.colors['muted-foreground']} />}
				label={translate('taskMenus.actions.createLabel')}
				onPress={onPress}
			/>
		);
	}
	return (
		<PickerCreateFooter
			label={translate('settingScreen.labelScreen.createNewLabelText')}
			canCreate
			readOnlyHint=""
			onPress={onPress}
		/>
	);
}

/**
 * A task's labels to pick, as the web's labels menu: each tap adds or takes away a label at once and the menu stays
 * open, the labels the task holds checked, a label's name kept as it was saved. Creating a label opens its form in
 * the dialog.
 */
const TaskLabelPopup: FC<Props> = observer(function TaskLabelPopup({
	visible,
	onDismiss,
	selectedLabels,
	onToggleLabel,
	canCreateLabel = false,
	anchor
}) {
	const { allTaskLabels, createLabel } = useTaskLabels();
	const [isCreating, setIsCreating] = useState<boolean>(false);

	// A picker closed while its create form shows opens on its labels next time
	const dismiss = () => {
		setIsCreating(false);
		onDismiss();
	};

	const onSelect = (option: PickerOption) => {
		const label = allTaskLabels.find((candidate) => candidate.id === option.key);
		if (label) {
			onToggleLabel(label);
		}
	};

	return (
		<PropertyPicker
			visible={visible}
			onDismiss={dismiss}
			title={translate('settingScreen.labelScreen.labels')}
			options={allTaskLabels.map((label) => labelOptionOf(label, selectedLabels))}
			onSelect={onSelect}
			anchor={anchor}
			searchPlaceholder={translate('taskMenus.search.label')}
			keepsCase
			footer={
				canCreateLabel && <LabelCreateFooter anchored={Boolean(anchor)} onPress={() => setIsCreating(true)} />
			}
		>
			{isCreating && (
				<TaskLabelForm
					isEdit={false}
					onDismiss={() => setIsCreating(false)}
					onCreateLabel={createLabel}
					onUpdateLabel={keepLabelUnchanged}
				/>
			)}
		</PropertyPicker>
	);
});

export default TaskLabelPopup;
