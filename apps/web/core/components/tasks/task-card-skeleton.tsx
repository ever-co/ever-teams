import Skeleton from 'react-loading-skeleton';
import { SixSquareGridIcon } from 'assets/svg';
import { EverCard } from '../common/ever-card';
import { VerticalSeparator } from '../duplicated-components/separator';

const TaskCardSkeleton = () => {
	return (
		<EverCard
			shadow="bigger"
			className="relative flex items-center justify-between py-8 my-4 border border-[#F0F0F0] dark:border-0"
		>
			<div className="absolute -left-0">
				<SixSquareGridIcon className="w-6 h-6 " />
			</div>
			<div>
				<Skeleton width={260} height={15} borderRadius={20} className="dark:bg-[#353741]" />
				<Skeleton width={120} height={15} borderRadius={20} className="dark:bg-[#353741] mt-4" />
			</div>

			<VerticalSeparator className="ml-2" />

			<div className="flex flex-col items-center justify-center w-48 space-y-2">
				<Skeleton height={20} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>

			<VerticalSeparator />

			<div className="flex flex-col items-center justify-center space-y-2">
				<Skeleton height={20} width={80} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<div className="flex flex-col items-center justify-center w-48 space-y-2">
				<Skeleton height={20} width={80} borderRadius={10} className="dark:bg-[#353741]" />
				<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<Skeleton height={50} width={50} borderRadius={50} className="dark:bg-[#353741]" />
			<VerticalSeparator />

			<Skeleton width={180} height={40} borderRadius={20} className="dark:bg-[#353741]" />
		</EverCard>
	);
};

export default TaskCardSkeleton;
