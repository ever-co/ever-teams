import React, { FC } from 'react';
import { ITaskPriorityItem } from '../../../../services/interfaces/ITaskPriority';
import TaskSettingRow from '../../../../components/task-setting-row';

interface IPriorityItem {
	priority: ITaskPriorityItem;
	onDeletePriority: () => unknown;
	openForEdit: () => unknown;
	/** Shows the edit and delete actions disabled, for a user who may not change it. */
	readOnly?: boolean;
}

/** A row of the team's task priorities: the shared settings row. */
const PriorityItem: FC<IPriorityItem> = ({ priority, onDeletePriority, openForEdit, readOnly = false }) => {
	return (
		<TaskSettingRow
			name={priority?.name ?? ''}
			color={priority?.color}
			iconUrl={priority?.fullIconUrl}
			onEdit={openForEdit}
			onDelete={onDeletePriority}
			readOnly={readOnly}
		/>
	);
};

export default PriorityItem;
