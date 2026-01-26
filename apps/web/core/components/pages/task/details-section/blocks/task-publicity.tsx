import { useSetActiveTask } from '@/core/hooks/organizations/teams/use-set-active-task';
import { useUpdateTaskMutation } from '@/core/hooks/organizations/teams/use-update-task.mutation';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { clsxm } from '@/core/lib/utils';
import { GlobeIcon, LockIcon } from 'assets/svg';
import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

const TaskPublicity = () => {
	const {
		detailedTaskQuery: { data: task },
		detailedTaskId
	} = useDetailedTask();

	const t = useTranslations();
	const [isTaskPublic, setIsTaskPublic] = useState<boolean | undefined | null>(task?.public);
	const { mutateAsync: updatePublicity } = useUpdateTaskMutation();
	const { setActiveTask } = useSetActiveTask();

	const handlePublicity = useCallback(
		(value: boolean) => {
			setIsTaskPublic(value);
			const debounceUpdatePublicity = debounce((value) => {
				if (!task?.id || !detailedTaskId) return setIsTaskPublic(task?.public);
				updatePublicity({ taskId: task?.id, taskData: { ...task, public: value } })
					.then((task) => setActiveTask(task))
					.then(() => setIsTaskPublic(value));
			}, 500);
			debounceUpdatePublicity(value);
		},
		[task, updatePublicity]
	);

	useEffect(() => {
		setIsTaskPublic(task?.public);
	}, [task?.public]);

	return (
		<div
			className={clsxm(
				'h-[2.375rem] border-y border-solid border-color-[rgba(0,0,0,0.07)] dark:border-[#26272C] ',
				'bg-[#FBFAFA] dark:bg-dark--theme-light',
				'details-label px-4 flex justify-between'
			)}
		>
			<div className="text-[#293241] dark:text-white flex items-center gap-2">
				{!isTaskPublic && (
					<>
						<LockIcon className="text-black dark:text-[#a6a2b2] w-3 3xl:w-4" />
						<p className="text-[0.625rem] 3xl:text-[0.700rem]">{t('common.PRIVATE_TASK')}</p>
					</>
				)}

				{isTaskPublic && (
					<>
						<GlobeIcon className="text-black dark:text-[#a6a2b2] w-3 3xl:w-4" strokeWidth="2" />
						<p className="text-[0.625rem] 3xl:text-[0.700rem]">{t('common.PUBLIC_TASK')}</p>
					</>
				)}
			</div>
			<div
				onClick={() => handlePublicity(!isTaskPublic)}
				className="flex items-center cursor-pointer text-[0.625rem] text-[#A5A2B2]"
			>
				{!isTaskPublic ? t('common.PUBLIC_TASK_LABEL') : t('common.PRIVATE_TASK_LABEL')}
			</div>
		</div>
	);
};

export default TaskPublicity;
