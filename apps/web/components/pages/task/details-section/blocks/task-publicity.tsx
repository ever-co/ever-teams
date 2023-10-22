import { useTeamTasks } from '@app/hooks';
import { detailedTaskState } from '@app/stores';
import { clsxm } from '@app/utils';
import { GlobIcon, LockIcon } from 'lib/components/svgs';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

const TaskPublicity = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { t } = useTranslation();
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
			{isTaskPublic ? (
				<>
					<div className="text-[#293241] dark:text-white flex items-center gap-2">
						<GlobIcon className="stroke-black dark:stroke-[#a6a2b2] w-3 3xl:w-4" />
						<p className="text-[0.625rem] 3xl:text-[0.700rem]">{t('common.PUBLIC_TASK')}</p>
					</div>
					<div
						onClick={() => handlePublicity(false)}
						className="flex items-center cursor-pointer text-[0.625rem] 3xl:text-[0.700rem] text-[#A5A2B2]"
					>
						{t('common.PRIVATE_TASK_LABEL')}
					</div>
				</>
			) : (
				<>
					<div className="text-[#293241] dark:text-white flex items-center gap-2">
						<LockIcon className="stroke-black dark:stroke-[#a6a2b2] w-3" />
						<p className="text-[0.625rem]">{t('common.PRIVATE_TASK')}</p>
					</div>
					<div
						onClick={() => handlePublicity(true)}
						className="flex items-center cursor-pointer text-[0.625rem] text-[#A5A2B2]"
					>
						{t('common.PUBLIC_TASK_LABEL')}
					</div>
				</>
			)}
		</div>
	);
};

export default TaskPublicity;
