import Image from 'next/image';
import TaskMainInfo from './details-section/blocks/task-main-info';
import TaskSecondaryInfo from './details-section/blocks/task-secondary-info';
import TaskProgress from './details-section/blocks/task-progress';
import TaskEstimationsInfo from './details-section/blocks/task-estimations-info';

const TaskDetailsAside = () => {
	return (
		<section className="border border-solid border-[#00000014] rounded-xl">
			<div className="flex justify-between h-[52px] px-[15px] items-center">
				<div className="not-italic font-semibold text-base leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
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
						alt="download"
						width={16}
						height={16}
						className="mr-3"
					/>
					<Image src="/assets/svg/more.svg" alt="more" width={16} height={16} />
				</div>
			</div>
			<div
				className="h-[38px] border-y border-solid border-color-[rgba(0,0,0,0.07)] bg-[#FBFAFA] dark:bg-dark--theme
details-label px-5 flex justify-between"
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
				<div className="flex items-center cursor-pointer">Make public</div>
			</div>
			<TaskMainInfo />
			<TaskSecondaryInfo />
			<TaskEstimationsInfo />
			<TaskProgress />
		</section>
	);
};

export default TaskDetailsAside;
