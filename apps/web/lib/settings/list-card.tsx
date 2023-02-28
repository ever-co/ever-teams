import { Edit2Icon, TrashIcon } from 'lib/components/svgs';
import { Button, Text, Tooltip } from 'lib/components';
import Image from 'next/image';
import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';

export const StatusesListCard = ({
	statusIcon,
	statusTitle,
	bgColor,
	onEdit,
	onDelete,
	isStatus,
}: {
	statusIcon: string;
	statusTitle: string;
	bgColor: string;
	onEdit: any;
	onDelete: any;
	isStatus?: boolean;
}) => {
	return (
		<div className="border xs:w-[21.4rem] w-72 flex items-center p-1 rounded-xl justify-between">
			<div
				className={`rounded-xl ${
					isStatus || statusTitle.length >= CHARACTER_LIMIT_TO_SHOW
						? 'w-2/3'
						: 'w-auto'
				} flex items-center p-3 gap-x-2 overflow-hidden mr-1`}
				style={{ backgroundColor: bgColor }}
			>
				{statusIcon && (
					<Image
						src={statusIcon}
						alt={statusTitle || ''}
						width={20}
						height={20}
						decoding="async"
						data-nimg="1"
						loading="lazy"
						className='min-h-[20px]'
					/>
				)}
				<Tooltip
					label={statusTitle}
					enabled={statusTitle.length >= CHARACTER_LIMIT_TO_SHOW}
					placement="auto"
					className="overflow-hidden text-ellipsis whitespace-nowrap w-full"
				>
					<Text.Label className="flex-none flex-grow-0 text-md font-normal dark:text-black capitalize overflow-hidden text-ellipsis whitespace-nowrap w-full">
						{statusTitle}
					</Text.Label>
				</Tooltip>
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
