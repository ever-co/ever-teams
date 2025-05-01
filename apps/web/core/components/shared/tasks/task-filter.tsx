import { CheckIcon } from '@heroicons/react/24/outline';

interface ITaskFilter {
	type: 'open' | 'closed';
	count: number;
	selected: boolean;
	handleChange?: any;
}
const TaskFilter = ({ type, count, selected, handleChange }: ITaskFilter) => {
	return (
		<div
			className="w-[95px] h-[30px] bg-[#F0ECFD] flex items-center px-[10px] py-1 cursor-pointer space-x-2 rounded-[6px]"
			onClick={handleChange}
		>
			{type === 'open' ? (
				<div
					className={`w-[10px] h-[10px] ${selected === true ? 'bg-[#28D581]' : 'bg-[#ACB3BB]'} rounded-full`}
				/>
			) : (
				<CheckIcon className={`${selected === true ? 'text-primary' : 'text-[#ACB3BB]'} w-[18px]`} />
			)}
			<div
				className={`text-[12px] w-full  ${selected ? 'text-primary font-bold' : 'text-[#ACB3BB] font-light'} `}
			>
				{count + ' ' + type}
			</div>
		</div>
	);
};

export default TaskFilter;
