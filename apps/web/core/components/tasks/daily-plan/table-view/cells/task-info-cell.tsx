import { CellContext } from '@tanstack/react-table';
import { TaskInfo } from '../../../task-card';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function DailyPlanTaskInfoCell(props: CellContext<TTask, unknown>) {
	return <TaskInfo task={props.row.original} className="w-72 !max-w-80 px-4" tab={'default'} />;
}
