import { CellContext } from '@tanstack/react-table';
import { TaskInfo } from '../../../task-card';
import { ITeamTask } from '@/app/interfaces';

export default function DailyPlanTaskInfoCell(props: CellContext<ITeamTask, unknown>) {
	return <TaskInfo task={props.row.original} className="w-full px-4" tab={'default'} />;
}
