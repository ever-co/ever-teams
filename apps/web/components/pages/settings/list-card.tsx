import { Edit2Icon, TrashIcon } from 'lib/components/svgs';
import { Button, Text } from 'lib/components';
import Image from 'next/image';

const StatusesListCard = ({
	statusIcon,
	statusTitle,
	bgColor,
	onEdit,
	onDelete,
}: any) => {
	return (
		<div className="border w-[49%] flex items-center p-1 rounded-xl justify-between">
			<div
				className={`rounded-xl w-2/3 flex items-center p-3 gap-x-2 `}
				style={{ backgroundColor: bgColor }}
			>
				{statusIcon && <Image src={statusIcon} alt={statusTitle} />}
				<Text className="flex-none flex-grow-0 text-md font-normal dark:text-black capitalize">
					{statusTitle}
				</Text>
			</div>
			<div className="flex items-center gap-x-[12PX] mr-[4px]">
				<Button variant="ghost" className="p-0 m-0 min-w-0" onClick={onEdit}>
					<Edit2Icon />
				</Button>
				<Button variant="ghost" className="p-0 m-0 min-w-0" onClick={onDelete}>
					<TrashIcon />
				</Button>
			</div>
		</div>
	);
};
export default StatusesListCard;
