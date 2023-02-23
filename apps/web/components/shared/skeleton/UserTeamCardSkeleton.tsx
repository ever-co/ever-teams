import {
	Card,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon } from 'lib/components/svgs';
import Skeleton from 'react-loading-skeleton';

const UserTeamCardSkeleton = () => {
	return (
		<Card shadow="bigger" className="relative flex items-center py-4 my-6">
			<div className="opacity-40 absolute -left-0">
				<DraggerIcon />
			</div>
			<div className="w-[330px] px-4 flex space-x-3 items-center">
				<div className="opacity-40 w-8 h-8 bg-slate-400 rounded-full" />
				<div className="opacity-40 w-10 h-10 bg-slate-400 rounded-full" />
				<Skeleton
					height={20}
					width={180}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
			</div>
			<VerticalSeparator />

			<div className="w-[330px] px-4 flex flex-col items-center">
				<div className="flex flex-col items-start">
					<Skeleton
						height={10}
						width={280}
						borderRadius={10}
						className="dark:bg-dark--theme-light ml-2"
					/>
					<Skeleton
						height={10}
						width={120}
						borderRadius={10}
						className="dark:bg-dark--theme-light ml-2"
					/>
				</div>
				<div className="flex justify-around items-center">
					<Skeleton
						height={15}
						width={80}
						borderRadius={10}
						className="dark:bg-dark--theme-light mr-2"
					/>
					<Skeleton
						height={15}
						width={80}
						borderRadius={10}
						className="dark:bg-dark--theme-light mr-2"
					/>
					<Skeleton
						height={15}
						width={80}
						borderRadius={10}
						className="dark:bg-dark--theme-light"
					/>
				</div>
			</div>
			<VerticalSeparator className="ml-2" />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton
					height={20}
					width={120}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
				<Skeleton
					height={10}
					width={160}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
			</div>
			<VerticalSeparator />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton
					height={20}
					width={120}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
				<Skeleton
					height={10}
					width={160}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
			</div>
			<VerticalSeparator />

			<div className="flex space-y-2 items-center w-48 justify-center flex-col">
				<Skeleton
					height={20}
					width={120}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
				<Skeleton
					height={10}
					width={160}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
			</div>
		</Card>
	);
};

export default UserTeamCardSkeleton;
