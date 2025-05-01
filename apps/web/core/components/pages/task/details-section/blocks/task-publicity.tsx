import { useTeamTasks } from '@/core/hooks';
import { detailedTaskState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { GlobeIcon, LockIcon } from 'assets/svg';

const TaskPublicity = () => {
	const [task] = useAtom(detailedTaskState);
	const t = useTranslations();
	const [isTaskPublic, setIsTaskPublic] = useState<boolean | undefined>(task?.public);
	const { updatePublicity } = useTeamTasks();

	const handlePublicity = useCallback(
		(value: boolean) => {
			setIsTaskPublic(value);
			const debounceUpdatePublicity = debounce((value) => {
				updatePublicity(value, task, true);
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
