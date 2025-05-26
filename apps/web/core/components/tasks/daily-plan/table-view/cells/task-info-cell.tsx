import { CellContext } from '@tanstack/react-table';
import { TaskInfo } from '../../../task-card';
import { ITask } from '@/core/types/interfaces/task/ITask';

export default function DailyPlanTaskInfoCell(props: CellContext<ITask, unknown>) {
	return <TaskInfo task={props.row.original} className="w-full px-4" tab={'default'} />;
}
