import TaskMainInfo from './details-section/blocks/task-main-info';
import TaskSecondaryInfo from './details-section/blocks/task-secondary-info';
import TaskProgress from './details-section/blocks/task-progress';
import TaskEstimationsInfo from './details-section/blocks/task-estimations-info';
import TaskPublicity from './details-section/blocks/task-publicity';

const TaskDetailsAside = () => {
	return (
		<section className="border border-solid border-[#00000014] dark:border-[#7B8089] dark:bg-dark--theme rounded-xl">
			<div className="flex justify-between h-[52px] px-[15px] items-center">
				<div className="not-italic font-semibold text-base leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					Details
				</div>

				{/* TODO */}
				{/* Commented icon temporary, will be enable it in future once dynamic implementation done */}
				{/* <div className="flex">
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
				</div> */}
			</div>
			<TaskPublicity />
			<TaskMainInfo />
			<TaskSecondaryInfo />
			<TaskEstimationsInfo />
			<TaskProgress />
		</section>
	);
};

export default TaskDetailsAside;
