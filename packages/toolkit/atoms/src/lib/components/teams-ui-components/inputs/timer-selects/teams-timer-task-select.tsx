import { Select, Tooltip } from '@ever-teams/toolkit-ui';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTranslation } from 'react-i18next';
import { useMyTasks } from '@hooks/useMyTasks';

export const TeamsTimerTaskSelect = ({
	size,
	isTimerRunning,
	currentTeamsState,
	setCurrentTeamsState
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	isTimerRunning?: boolean;
	currentTeamsState: ICurrentTeamsState;
	setCurrentTeamsState: React.Dispatch<React.SetStateAction<ICurrentTeamsState>>;
}) => {
	const { t } = useTranslation();

	const { data: tasks, loading: userTasksLoading } = useMyTasks({ projectId: currentTeamsState?.projectId || null });

	return (
		<div className=" flex flex-col gap-2 ">
			<label htmlFor="task" className="text-sm">
				{t('COMMON.task')}
			</label>
			<Tooltip
				message={isTimerRunning ? t('WARNING.stop_timer_before_selecting', { item: t('COMMON.task') }) : ''}
			>
				<Select
					loading={userTasksLoading}
					name="task"
					size={size}
					placeholder={t('INPUT.task_select.select_task')}
					disabled={isTimerRunning}
					value={currentTeamsState?.taskId || undefined}
					defaultValue={currentTeamsState?.taskId || undefined}
					values={
						tasks && tasks.length > 0
							? tasks?.map((task) => {
									return { label: task.title.substring(0, 30), value: task.id };
								})
							: undefined
					}
					onValueChange={(e) => {
						setCurrentTeamsState((state: ICurrentTeamsState) => {
							return {
								...state,
								taskId: e
							};
						});
					}}
				/>
			</Tooltip>
		</div>
	);
};
