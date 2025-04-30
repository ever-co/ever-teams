import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces';
import { clsxm } from '@app/utils';
import { FilterTabs, TaskAllStatusTypes, TaskInput, TaskNameInfoDisplay } from '@/core/components/features';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
	tab?: 'default' | 'unassign' | 'dailyplan';
	dayPlanTab?: FilterTabs;
};

export function TaskInfo({ className, memberInfo, edition, publicTeam, tab, dayPlanTab }: Props) {
	return (
		<div className={clsxm('h-full flex flex-col items-start justify-between gap-[1.0625rem]', className)}>
			{/* task */}
			<div className={clsxm('w-full h-10', edition.editMode ? [''] : ['overflow-hidden'])}>
				{edition.task && (
					<TaskDetailAndEdition
						memberInfo={memberInfo}
						edition={edition}
						publicTeam={publicTeam}
						tab={tab}
						dayPlanTab={dayPlanTab}
					/>
				)}
				{!edition.task && <div className="text-center">--</div>}
			</div>

			{edition.task && (
				<TaskAllStatusTypes showStatus={true} task={edition.task} tab={tab} dayPlanTab={dayPlanTab} />
			)}
			{!edition.task && <div className="text-center self-center">--</div>}
		</div>
	);
}

export function TaskBlockInfo({ className, memberInfo, edition, publicTeam, tab, dayPlanTab }: Props) {
	const t = useTranslations();
	return (
		<div className={clsxm('h-full flex flex-col items-start justify-between gap-[1.0625rem]', className)}>
			{/* task */}
			<div className={clsxm('w-full h-12', edition.editMode ? [''] : ['overflow-hidden'])}>
				{edition.task && (
					<TaskDetailAndEdition
						memberInfo={memberInfo}
						edition={edition}
						publicTeam={publicTeam}
						tab={tab}
						dayPlanTab={dayPlanTab}
					/>
				)}
				{!edition.task && (
					<div className="text-center">
						<p>{t('common.THERE_IS_NO_TASK_ASSIGNED')}</p>
					</div>
				)}
			</div>

			{edition.task && (
				<TaskAllStatusTypes
					showStatus={true}
					task={edition.task}
					toBlockCard={true}
					tab={tab}
					dayPlanTab={dayPlanTab}
				/>
			)}
			{!edition.task && <div className="text-center self-center text-white dark:text-dark">_</div>}
		</div>
	);
}

/**
 *  A component that is used to display the task name and also allow the user to edit the task name.
 */
function TaskDetailAndEdition({ edition, publicTeam }: Props) {
	const task = edition.task;
	const hasEditMode = edition.editMode && task;
	const router = useRouter();

	edition.taskEditIgnoreElement.onOutsideClick(() => {
		edition.setEditMode(false);
	});

	return (
		<>
			{/* Task value */}
			<div
				ref={edition.taskEditIgnoreElement.targetEl}
				className={clsxm(
					'text-xs lg:text-sm text-ellipsis overflow-hidden cursor-pointer w-full',
					hasEditMode && ['hidden']
				)}
				onClick={publicTeam ? () => null : () => task && router.push(`/task/${task?.id}`)}
			>
				<TaskNameInfoDisplay
					showSize={true}
					task={task}
					className={`${
						task?.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]'
					} rounded-sm`}
					taskTitleClassName="mt-[0.0625rem]"
				/>
			</div>

			{/* Show task input combobox when in edit mode */}
			<div ref={edition.taskEditIgnoreElement.ignoreElementRef} className={clsxm(!hasEditMode && ['hidden'])}>
				{hasEditMode && (
					<TaskInput
						task={task}
						initEditMode={true}
						keepOpen={true}
						showCombobox={false}
						autoFocus={true}
						autoInputSelectText={true}
						onTaskClick={(e) => {
							console.log(e);
						}}
						onEnterKey={() => {
							edition.setEditMode(false);
						}}
					/>
				)}
			</div>
		</>
	);
}
