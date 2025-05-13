import { CellContext } from '@tanstack/react-table';
import { TaskInfo2 } from '../../../task-card';
import { ITeamTask } from '@/core/types/interfaces';

export default function DailyPlanTaskInfoCell(props: CellContext<ITeamTask, unknown>) {
	return <TaskInfo2 task={props.row.original} className="w-full px-4" tab={'default'} />;
}
