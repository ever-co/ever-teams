import React, { ReactNode, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskSettingsAccess } from '../services/hooks/features/use-task-settings-access';
import { formatName } from '../helpers/name-format';
import { PickerCreateFooter, PickerOption, PropertyPicker } from './property-picker';

export interface TaskSettingItem {
	id: string;
	name?: string;
	value?: string;
	color?: string;
	fullIconUrl?: string;
}

/** A status, priority or size as a picker row: its formatted name, color and icon, checked when the task holds it. */
export function settingOptionOf(item: TaskSettingItem, selectedValue: string): PickerOption {
	return {
		key: item.id,
		name: formatName(item.name ?? ''),
		color: item.color,
		iconUrl: item.fullIconUrl,
		isSelected: item.value === selectedValue
	};
}

interface ITaskSettingPicker<T extends TaskSettingItem> {
	visible: boolean;
	onDismiss: () => unknown;
	title: string;
	items: T[];
	optionOf: (item: T) => PickerOption;
	onPick: (item: T) => unknown;
	/** Offers to create a value from the picker, as the task page does. */
	canCreateHere?: boolean;
	createLabel: string;
	renderCreateForm: (close: () => void) => ReactNode;
}

function TaskSettingPickerView<T extends TaskSettingItem>({
	visible,
	onDismiss,
	title,
	items,
	optionOf,
	onPick,
	canCreateHere,
	createLabel,
	renderCreateForm
}: Readonly<ITaskSettingPicker<T>>) {
	const { canCreate, readOnlyHint } = useTaskSettingsAccess();
	const [isCreating, setIsCreating] = useState<boolean>(false);

	// A picker closed while its create form shows opens on its values next time
	const dismiss = () => {
		setIsCreating(false);
		onDismiss();
	};

	const onSelect = (option: PickerOption) => {
		const item = items.find((candidate) => candidate.id === option.key);
		if (item) {
			onPick(item);
		}
		dismiss();
	};

	return (
		<PropertyPicker
			visible={visible}
			onDismiss={dismiss}
			title={title}
			options={items.map(optionOf)}
			onSelect={onSelect}
			footer={
				canCreateHere && (
					<PickerCreateFooter
						label={createLabel}
						canCreate={canCreate}
						readOnlyHint={readOnlyHint}
						onPress={() => setIsCreating(true)}
					/>
				)
			}
		>
			{isCreating && renderCreateForm(() => setIsCreating(false))}
		</PropertyPicker>
	);
}

/** A task setting picker: its values, the one the task holds checked, and create where the task page offers it. */
export const TaskSettingPicker = observer(TaskSettingPickerView) as typeof TaskSettingPickerView;
