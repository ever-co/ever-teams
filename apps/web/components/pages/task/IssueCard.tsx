import ToolButton from '@components/pages/task/description-block/tool-button';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Card } from 'lib/components';
import Image from 'next/image';
import bugIcon from '../../../public/assets/svg/bug.svg';
import ideaIcon from '../../../public/assets/svg/idea.svg';
import { TaskStatusDropdown } from 'lib/features';

const data = [
	{
		taskType: bugIcon,
		issueNum: '#3245',
	},
	{
		taskType: ideaIcon,
		issueNum: '#3245',
	},
];

const IssueCard = ({ related }: { related: boolean }) => {
	return (
		<Card className="w-full mt-8" shadow="bigger">
			<div className="flex justify-between">
				{related ? (
					<h4 className="text-lg font-semibold pb-2">Related Issues</h4>
				) : (
					<h4 className="text-lg font-semibold pb-2">Child Issues</h4>
				)}

				<div className="flex items-center">
					<ToolButton iconSource="/assets/svg/add.svg" />
					<ToolButton iconSource="/assets/svg/more.svg" />
					<Image
						src="/assets/svg/line-up.svg"
						alt="line"
						width={18}
						height={18}
						style={{ height: '18px' }}
					/>
					<ChevronUpIcon className="h-5 w-5 text-[#292D32] cursor-pointer" />
				</div>
			</div>
			<hr />
			<div className="flex flex-col">
				{data.map((issue, idx) => (
					<div
						key={idx}
						className="flex justify-between items-center flex-wrap"
					>
						<div className="flex items-center my-4">
							<Image
								src={issue.taskType}
								alt="type"
								width={20}
								height={20}
								style={{ height: '20px' }}
							/>
							{related ? (
								<h5 className="ml-2 text-[#BAB8C4] font-medium">
									{issue.issueNum} - set your Related issues
								</h5>
							) : (
								<h5 className="ml-2 text-[#BAB8C4] font-medium">
									{issue.issueNum} - set your Child issues
								</h5>
							)}
							<div className="ml-2 bg-[#E9E9EC] rounded-md text-center w-24 h-9 mr-4 flex justify-center items-center ">
								<span className="text-black font-medium text-xs flex items-center px-2 sm:px-0">
									<Image
										src="/assets/svg/category.svg"
										alt="type"
										width={10}
										height={10}
										style={{ height: '10px', marginRight: '5px' }}
									/>
									User Profile
								</span>
							</div>
						</div>
						<div className="flex justify-between items-center">
							{related && (
								<select className='border rounded-md px-4 py-2 '>
									<option value="">Select</option>
								</select>
							)}
							<TaskStatusDropdown
								className="lg:min-w-[170px] !ml-4"
								forDetails={true}
							/>
						</div>
					</div>
				))}
			</div>
		</Card>
	);
};

export default IssueCard;
