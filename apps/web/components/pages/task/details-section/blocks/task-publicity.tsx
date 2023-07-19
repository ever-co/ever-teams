import Image from 'next/image';
import React from 'react';

const TaskPublicity = () => {
	return (
		<div
			className="h-[38px] border-y border-solid border-color-[rgba(0,0,0,0.07)] bg-[#FBFAFA] dark:bg-dark--theme
details-label px-4 flex justify-between"
		>
			<div className="text-[#293241] dark:text-white flex items-center ">
				<Image
					src="/assets/svg/lock.svg"
					alt="private task"
					width={14}
					height={14}
					style={{ height: '14px', marginRight: '5px' }}
				/>
				<div>This task is Private</div>
			</div>
			<div className="flex items-center cursor-pointer">Make a public</div>
		</div>
	);
};

export default TaskPublicity;
