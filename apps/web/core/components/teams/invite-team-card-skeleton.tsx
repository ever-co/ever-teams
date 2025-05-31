import { SixSquareGridIcon } from 'assets/svg';
import Skeleton from '../common/skeleton/skeleton';
import { EverCard } from '../common/ever-card';
import { VerticalSeparator } from '../duplicated-components/separator';

const InviteUserTeamCardSkeleton = () => {
	return (
		<EverCard shadow="bigger" className="relative flex items-center py-4 my-6">
			<div className="absolute opacity-40 -left-0">
				<SixSquareGridIcon className="w-6 h-6 " />
			</div>
			<div className="w-[330px] px-4 flex space-x-3 items-center">
				<div className="opacity-40 w-8 h-8 bg-slate-400 dark:bg-[#353741] rounded-full" />
				<Skeleton height={20} width={160} borderRadius={10} className="dark:bg-[#353741]" />
			</div>
			<VerticalSeparator />

			<div className="w-[330px] px-4 flex items-start">
				<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741] mr-2" />
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

export default InviteUserTeamCardSkeleton;
