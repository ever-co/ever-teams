import { CellContext } from '@tanstack/react-table';
import { TaskInfo } from '../../../task-card';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function DailyPlanTaskInfoCell(props: CellContext<TTask, unknown>) {
	return <TaskInfo task={props.row.original} className="w-full px-4" tab={'default'} />;
}
