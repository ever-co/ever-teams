import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { activeTeamDetailLoadingState } from '@/core/stores/teams/organization-team';
import { clsxm } from '@/core/lib/utils';
import { useAtomValue } from 'jotai';
import { TaskEstimate } from '../tasks/task-estimate';
import { TaskInput } from '../tasks/task-input';
import { TaskLabels } from '../tasks/task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from '../tasks/task-status';
import { useTranslations } from 'next-intl';
import { ProjectDropDown } from '@/core/components/pages/task/details-section/blocks/task-secondary-info';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { useActiveTeamTask } from '@/core/hooks/tasks/use-active-team-task';
import { AuthUserTaskInputSkeleton } from '@/core/components/common/skeleton/auth-user-task-input-skeleton';

export function AuthUserTaskInput({ className }: IClassName) {
	const t = useTranslations();
	const { activeTask: activeTeamTask, isLoading: isActiveTaskLoading } = useActiveTeamTask();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const activeTeam = useAtomValue(activeTeamState);
	const isTeamUnknown = !activeTeam;
	// The first team response lists the members without their active task; the detail brings it.
	const isTeamDetailPending = useAtomValue(activeTeamDetailLoadingState);
	const isResolving = isActiveTaskLoading || isTeamUnknown || isTeamDetailPending;
	const isActiveTaskPending = !activeTeamTask && isResolving;

	if (isActiveTaskPending) {
		return <AuthUserTaskInputSkeleton className={className} />;
	}

	// min-w-0: a flex child defaults to min-width:auto, so this column could never shrink below its
	// dropdown row and pushed the Timer (and its play button) past the right edge on 1280/1366px
	// screens; the row wraps instead.
	return (
		<div className={clsxm('flex flex-col flex-1 gap-4 mt-8 min-w-0 lg:mt-0', className)}>
			<TaskInput
				fullWidthCombobox={true}
				createOnEnterClick={true}
				showTaskNumber={true}
				autoAssignTaskAuth={isTrackingEnabled}
				task={activeTeamTask}
			/>
			<div className="flex flex-row flex-wrap gap-3 items-center ml-2 lg:gap-4 md:justify-between lg:justify-start">
				<div className="items-center mb-4 xl:flex lg:mb-0">
					<span className="pr-2 font-normal text-muted-foreground">{t('common.ESTIMATE')}:</span>
					<TaskEstimate _task={activeTeamTask} />
				</div>

				<div className="hidden flex-1 gap-2 justify-end md:flex md:items-center">
					<ActiveTaskStatusDropdown
						task={activeTeamTask}
						className="w-fit lg:max-w-[190px]"
						disabled={!activeTeamTask}
					/>

					<ActiveTaskPropertiesDropdown
						task={activeTeamTask}
						className="w-fit lg:max-w-[190px]"
						disabled={!activeTeamTask}
					/>

					<ActiveTaskSizesDropdown
						task={activeTeamTask}
						className="w-fit lg:max-w-[190px]"
						disabled={!activeTeamTask}
					/>

					<TaskLabels task={activeTeamTask} className="w-fit lg:max-w-[170px]" forDetails={false} />
					{activeTeamTask && (
						<ProjectDropDown
							styles={{
								container: 'min-w-0 max-w-[190px]'
							}}
							task={activeTeamTask}
						/>
					)}
				</div>
				{/* <div className="grid justify-items-center md:hidden">
					<div className="flex">
						<ActiveTaskStatusDropdown className="mr-2 w-32" disabled={!activeTeamTask} />
						<ActiveTaskPropertiesDropdown className="w-32" disabled={!activeTeamTask} />
					</div>
					<div className="flex mt-2">
						<ActiveTaskSizesDropdown className="mr-2 w-32" disabled={!activeTeamTask} />
						<TaskLabels task={activeTeamTask} className="min-w-fit lg:max-w-[170px]" forDetails={false} />
					</div>
				</div> */}
			</div>
		</div>
	);
}
