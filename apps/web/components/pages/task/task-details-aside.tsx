import Image from 'next/image';
import TaskMainInfo from './details-section/blocks/task-main-info';
import TaskSecondaryInfo from './details-section/blocks/task-secondary-info';

const TaskDetailsAside = () => {
	return (
		<>
			<div className="flex justify-between h-[52px] px-[15px] items-center">
				<div className="not-italic font-semibold text-base leading-[140%] tracking-[-0.02em] text-[#282048]">
					Details
				</div>
				<div className="flex">
					<Image
						src="/assets/svg/printer.svg"
						alt="printer"
						width={16}
						height={16}
						className="mr-3"
					/>
					<Image
						src="/assets/svg/document-download.svg"
						alt="printer"
						width={16}
						height={16}
						className="mr-3"
					/>
					<Image
						src="/assets/svg/more.svg"
						alt="printer"
						width={16}
						height={16}
					/>
				</div>
			</div>
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
					<div>This task is Private</div>
				</div>
				<div className="flex items-center cursor-pointer">Make public</div>
			</div>
			<TaskMainInfo />
			<TaskSecondaryInfo />
		</>
	);
};

export default TaskDetailsAside;
