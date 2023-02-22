import { detailedTaskState } from '@app/stores';
import Image from 'next/image';
import { useRecoilState } from 'recoil';

const TaskPrivacy = () => {
	const [task] = useRecoilState(detailedTaskState);

	return (
		<div
			className="h-[38px] border-y border-solid border-color-[rgba(0,0,0,0.07)] bg-[#FBFAFA] 
details-label px-[15px] flex justify-between"
		>
			<div className="text-[#293241] flex items-center">
				<Image
					src="/assets/svg/lock.svg"
					alt="private task"
					width={14}
					height={14}
					style={{ height: '14px', marginRight: '5px' }}
				/>
				<div>
					This task is {task?.privacy === 'private' ? 'private' : 'public'}
				</div>
			</div>
			<div className="flex items-center cursor-pointer">
				Make {task?.privacy === 'private' ? 'public' : 'private'}
			</div>
		</div>
	);
};

export default TaskPrivacy;
