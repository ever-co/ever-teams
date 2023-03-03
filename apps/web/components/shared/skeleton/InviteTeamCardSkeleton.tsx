import Skeleton from 'react-loading-skeleton';
import { Card, VerticalSeparator } from 'lib/components';
import { DraggerIcon } from 'lib/components/svgs';

const InviteUserTeamCardSkeleton = () => {
	return (
		<Card shadow="bigger" className="relative flex items-center py-4 my-6">
			<div className="opacity-40 absolute -left-0">
				<DraggerIcon />
			</div>
			<div className="w-[330px] px-4 flex space-x-3 items-center">
				<div className="opacity-40 w-8 h-8 bg-slate-400 dark:bg-[#353741] rounded-full" />
				<Skeleton
					height={20}
					width={180}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
			</div>
			<VerticalSeparator />

			<div className="w-[330px] px-4 flex items-start">
				<Skeleton
					height={10}
					width={120}
					borderRadius={10}
					className="dark:bg-[#353741] mr-2"
				/>
			</div>
			<VerticalSeparator className="ml-2" />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton
					height={20}
					width={120}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
				<Skeleton
					height={10}
					width={160}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
			</div>
			<VerticalSeparator />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton
					height={20}
					width={120}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
				<Skeleton
					height={10}
					width={160}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
			</div>
			<VerticalSeparator />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton
					height={20}
					width={120}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
				<Skeleton
					height={10}
					width={160}
					borderRadius={10}
					className="dark:bg-[#353741]"
				/>
			</div>
		</Card>
	);
};

export default InviteUserTeamCardSkeleton;
