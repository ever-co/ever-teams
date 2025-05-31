import { clsxm } from '@/core/lib/utils';
import { SixSquareGridIcon } from 'assets/svg';
import { EverCard } from '../common/ever-card';
import { VerticalSeparator } from '../duplicated-components/separator';

const UserTeamCardSkeletonCard = () => {
	return (
		<EverCard shadow="bigger" className="relative flex items-center py-4 my-6">
			<div className="absolute opacity-40 -left-0">
				<SixSquareGridIcon className="w-6 h-6 " />
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
				<div className="flex items-center justify-around gap-2">
					<Skeleton height={15} width={80} borderRadius={10} className="dark:bg-[#353741] mr-2" />
					<Skeleton height={15} width={80} borderRadius={10} className="dark:bg-[#353741] mr-2" />
					<Skeleton height={15} width={80} borderRadius={10} className="dark:bg-[#353741]" />
				</div>
			</div>
			<VerticalSeparator className="ml-2" />

			<div className="flex flex-col items-center justify-center w-48 space-y-2">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<VerticalSeparator />

			<div className="flex flex-col items-center justify-center w-48 space-y-2">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<VerticalSeparator />

			<div className="flex flex-col items-center justify-center w-48 space-y-2">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
		</EverCard>
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
			style={{ borderRadius }}
		></div>
	);
};

export default UserTeamCardSkeletonCard;
