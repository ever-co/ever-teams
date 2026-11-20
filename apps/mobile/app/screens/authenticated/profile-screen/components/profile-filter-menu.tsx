import React from 'react';
import { Modal } from 'react-native';
import { FilterCategory, FilterMenu, FilterOption, labelOptionsOf } from '../../../../components/filter-menu';
import {
	TStatus,
	useTaskPriorityValue,
	useTaskSizeValue,
	useTaskStatusValue
} from '../../../../components/status-type';
import { translate } from '../../../../i18n';
import { ITaskFilter } from '../../../../services/hooks/features/use-task-filters';
import { useTaskLabels } from '../../../../services/hooks/features/use-task-labels';
import type { MenuRect } from '../../../../../src/components/menu-placement';

type FilterField = 'status' | 'priority' | 'size' | 'label';

/** A property's values as filter options, each keyed by the value a task holds. */
export function filterOptionsOf(values: TStatus<string>): FilterOption[] {
	return Object.entries(values).map(([key, item]) => ({
		value: item.value || key,
		name: item.name ?? key,
		color: item.bgColor,
		iconUrl: item.iconUrl,
		storedIcon: item.storedIcon
	}));
}

/** The profile's four filters, as the web's profile lists them: status, priority, size and labels. */
function useProfileFilterCategories(): FilterCategory<FilterField>[] {
	const statuses = useTaskStatusValue();
	const priorities = useTaskPriorityValue();
	const sizes = useTaskSizeValue();
	const { allTaskLabels } = useTaskLabels();
	return [
		{
			field: 'status',
			kind: 'status',
			label: translate('taskMenus.filter.status'),
			options: filterOptionsOf(statuses)
		},
		{
			field: 'priority',
			kind: 'priority',
			label: translate('taskMenus.filter.priority'),
			options: filterOptionsOf(priorities)
		},
		{ field: 'size', kind: 'size', label: translate('taskMenus.filter.size'), options: filterOptionsOf(sizes) },
		{
			field: 'label',
			kind: 'label',
			label: translate('taskMenus.filter.labels'),
			options: labelOptionsOf(allTaskLabels),
			keepsCase: true
		}
	];
}

interface IProfileFilterMenu {
	visible: boolean;
	/** The Filter button, in window coordinates. */
	anchor: MenuRect;
	hook: ITaskFilter;
	onDismiss: () => unknown;
}

/** The profile's task filter, opened from its Filter button: each value applied at once, as on the web. */
export function ProfileFilterMenu({ visible, anchor, hook, onDismiss }: Readonly<IProfileFilterMenu>) {
	const categories = useProfileFilterCategories();
	return (
		<Modal animationType="fade" transparent visible={visible} onRequestClose={() => onDismiss()}>
			<FilterMenu
				anchor={anchor}
				categories={categories}
				selection={hook.appliedStatusFilter}
				onChange={hook.changeStatusFilter}
				onClear={hook.onResetStatusFilter}
				onDismiss={onDismiss}
			/>
		</Modal>
	);
}
