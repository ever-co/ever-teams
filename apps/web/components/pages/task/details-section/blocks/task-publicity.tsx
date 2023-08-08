import { detailedTaskState } from '@app/stores';
import React, { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useTeamTasks } from '@app/hooks';
import { clsxm } from '@app/utils';
import { GlobIcon, LockIcon } from 'lib/components/svgs';

const TaskPublicity = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { updatePublicity } = useTeamTasks();

	const handlePublicity = useCallback(
		(value: boolean) => {
			updatePublicity(value, task, true);
		},
		[task, updatePublicity]
	);

	return (
		<div
			className={clsxm(
				'h-[38px] border-y border-solid border-color-[rgba(0,0,0,0.07)] dark:border-[#7B8089] ',
				'bg-[#FBFAFA] dark:bg-dark--theme-light',
				'details-label px-4 flex justify-between'
			)}
		>
			{task?.public ? (
				<>
					<div className="text-[#293241] dark:text-white flex items-center">
						{/* <Image
							src="/assets/svg/public.svg"
							alt="private task"
							width={14}
							height={14}
							style={{ height: '14px', marginRight: '5px' }}
							className="mb-1"
						/> */}
						<GlobIcon className="stroke-black dark:stroke-[#a6a2b2] mr-2 w-4" />
						<div>This task is Public</div>
					</div>
					<div
						onClick={() => handlePublicity(false)}
						className="flex items-center cursor-pointer"
					>
						Make a private
					</div>
				</>
			) : (
				<>
					<div className="text-[#293241] dark:text-white flex items-center ">
						{/* <Image
							src="/assets/svg/lock.svg"
							alt="private task"
							width={14}
							height={14}
							style={{ height: '14px', marginRight: '5px' }}
							className="mb-1"
						/> */}
						<LockIcon className="stroke-black dark:stroke-[#a6a2b2] mr-2 w-4" />
						<div>This task is Private</div>
					</div>
					<div
						onClick={() => handlePublicity(true)}
						className="flex items-center cursor-pointer"
					>
						Make a public
					</div>
				</>
			)}
		</div>
	);
};

export default TaskPublicity;
