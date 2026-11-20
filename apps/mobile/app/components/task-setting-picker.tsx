import React, { ReactNode, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskSettingsAccess } from '../services/hooks/features/use-task-settings-access';
import { formatName } from '../helpers/name-format';
import { PickerCreateFooter, PickerOption, PropertyPicker } from './property-picker';
import { PropertyMenuAction } from './property-menu';
import { useWebTheme } from '../theme';
import { Plus } from '../../src/components/icons';
import type { MenuRect } from '../../src/components/menu-placement';
import type { TaskPropertyKind } from '../../src/components/task-property-icon';
import { MENU_ICON_SIZE } from '../../src/theme/menu-look';

export interface TaskSettingItem {
	id: string;
	name?: string;
	value?: string;
	color?: string;
	fullIconUrl?: string;
	/** The icon the value was saved with, as Gauzy stores it. */
	icon?: string;
}

/** A status, priority or size as a picker row: its formatted name, color and icon, checked when the task holds it. */
export function settingOptionOf(item: TaskSettingItem, selectedValue: string): PickerOption {
	return {
		key: item.id,
		name: formatName(item.name ?? ''),
		color: item.color,
		iconUrl: item.fullIconUrl,
		storedIcon: item.icon,
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
	/** What the values are, so the menu draws the web's glyph for each. */
	kind?: TaskPropertyKind;
	/** The chip that opened the picker: the values then show in the web's menu under it. */
	anchor?: MenuRect | null;
	/** The menu's search line. */
	searchPlaceholder?: string;
	/** The menu's create action, in the web's words; the dialog keeps its create button's label. */
	menuCreateLabel?: string;
}

interface ICreateFooter {
	anchored: boolean;
	label: string;
	menuLabel?: string;
	canCreate: boolean;
	readOnlyHint: string;
	onPress: () => void;
}

/** The way to create a value under the values: the menu's action row, or the dialog's button. */
function CreateFooter({ anchored, label, menuLabel, canCreate, readOnlyHint, onPress }: Readonly<ICreateFooter>) {
	const theme = useWebTheme();
	if (anchored) {
		return (
			<PropertyMenuAction
				icon={<Plus size={MENU_ICON_SIZE} color={theme.colors['muted-foreground']} />}
				label={menuLabel ?? label}
				onPress={onPress}
				disabled={!canCreate}
				hint={readOnlyHint}
			/>
		);
	}
	return <PickerCreateFooter label={label} canCreate={canCreate} readOnlyHint={readOnlyHint} onPress={onPress} />;
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
	renderCreateForm,
	kind,
	anchor,
	searchPlaceholder,
	menuCreateLabel
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
			options={items.map((item) => ({ ...optionOf(item), kind }))}
			onSelect={onSelect}
			anchor={anchor}
			searchPlaceholder={searchPlaceholder}
			footer={
				canCreateHere && (
					<CreateFooter
						anchored={Boolean(anchor)}
						label={createLabel}
						menuLabel={menuCreateLabel}
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
