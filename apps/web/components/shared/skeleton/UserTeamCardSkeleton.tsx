import { clsxm } from '@app/utils';
import { Card, VerticalSeparator } from 'lib/components';
import { DraggerIcon } from 'lib/components/svgs';

const UserTeamCardSkeletonCard = () => {
	return (
		<Card shadow="bigger" className="relative flex items-center py-4 my-6">
			<div className="opacity-40 absolute -left-0">
				<DraggerIcon />
			</div>
			<div className="w-[330px] px-4 flex space-x-3 items-center">
				<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] rounded-full" />
				<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] rounded-full" />
				<Skeleton height={20} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<VerticalSeparator />

			<div className="w-[330px] px-4 flex flex-col items-center gap-2">
				<div className="flex flex-col items-start gap-2">
					<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741] ml-2" />
					<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741] ml-2" />
				</div>
				<div className="flex justify-around items-center gap-2">
					<Skeleton height={15} width={80} borderRadius={10} className="dark:bg-[#353741] mr-2" />
					<Skeleton height={15} width={80} borderRadius={10} className="dark:bg-[#353741] mr-2" />
					<Skeleton height={15} width={80} borderRadius={10} className="dark:bg-[#353741]" />
				</div>
			</div>
			<VerticalSeparator className="ml-2" />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<VerticalSeparator />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<VerticalSeparator />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
		</Card>
	);
};

const Skeleton = ({
	height,
	width,
	borderRadius,
	className
}: {
	height: number;
	width: number;
	borderRadius: number;
	className: string;
}) => {	
	return (
		<div
			className={clsxm(
				'p-1  animate-pulse rounded-lg bg-[#F0F0F0] dark:bg-[#353741]',
				height ? `h-[${height}px]` : 'h-[20px]',
				width ? `w-[${width}px]` : 'w-[160px]',
				className
			)}
		></div>
	);
};

export default UserTeamCardSkeletonCard;
