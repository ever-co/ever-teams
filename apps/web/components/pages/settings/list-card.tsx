import { Edit2Icon, PeopleIcon, TrashIcon } from 'lib/components/svgs';
import { Text } from 'lib/components';

const StatusesListCard = ({
	statusIcon,
	statusTitle,
	bgColor,
	editClick,
	deletCelick,
	icon,
}: any) => {
	return (
		<div className="border w-[49%] flex items-center p-1 rounded-xl justify-between">
			<div
				className={`rounded-xl w-2/3 flex items-center p-3 gap-x-2 `}
				style={{ backgroundColor: bgColor }}
			>
				{icon}
				<Text className="flex-none flex-grow-0 text-md font-normal dark:text-black">
					{statusTitle}
				</Text>
			</div>
			<div className="flex items-center ">
				<Edit2Icon />
				<TrashIcon />
			</div>
		</div>
	);
};
export default StatusesListCard;
