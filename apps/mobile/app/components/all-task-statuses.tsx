import React from 'react';
import { StyleSheet, View } from 'react-native';
import LabelItem from './label-item';
import {
	TStatusItem,
	useTaskLabelValue,
	useTaskPriorityValue,
	useTaskSizeValue,
	useTaskStatusValue
} from './status-type';
import type { TaskPropertyKind } from '../../src/components/task-property-icon';
import { ITeamTask } from '../services/interfaces/ITask';

function nameMatches(item: { name?: string } | undefined, value: string | undefined): boolean {
	const name = item?.name;
	if (!name) {
		return false;
	}
	return name.toLowerCase() === value;
}

interface KindedChip {
	kind: TaskPropertyKind;
	item: TStatusItem | undefined;
}

/** A task's status, size, priority and labels as the web's chips, wrapping onto a second line when they need it. */
const AllTaskStatuses = ({ task }: { task: ITeamTask }) => {
	const allStatuses = useTaskStatusValue();
	const allSizes = useTaskSizeValue();
	const allPriorities = useTaskPriorityValue();
	const allLabels = useTaskLabelValue();

	const statusValue = task?.status?.split('-').join(' ').toLowerCase();
	const status = allStatuses && Object.values(allStatuses).find((item) => nameMatches(item, statusValue));

	const sizeValue = task?.size?.split('-').join(' ').toLowerCase();
	const size = allSizes && Object.values(allSizes).find((item) => nameMatches(item, sizeValue));

	const priorityValue = task?.priority?.split('-').join(' ').toLowerCase();
	const priority = allPriorities && Object.values(allPriorities).find((item) => nameMatches(item, priorityValue));

	const taskLabels = task?.tags?.map((tag) => allLabels[tag.name]) ?? [];
	const chips: KindedChip[] = [
		{ kind: 'status', item: status },
		{ kind: 'size', item: size },
		{ kind: 'priority', item: priority },
		...taskLabels.map((item): KindedChip => ({ kind: 'label', item }))
	];
	const shownChips = chips.filter((chip) => chip.item !== null && chip.item !== undefined);

	return (
		<View testID="task-chips" style={styles.chips}>
			{shownChips.map(({ kind, item }, index) => (
				<LabelItem
					key={`${item?.name}-${index}`}
					label={item?.name ?? ''}
					background={item?.bgColor ?? ''}
					icon={item?.icon}
					iconUrl={item?.iconUrl}
					kind={kind}
					storedIcon={item?.storedIcon}
				/>
			))}
		</View>
	);
};

export default AllTaskStatuses;

const styles = StyleSheet.create({
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 16,
		width: '100%'
	}
});
