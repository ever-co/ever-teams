import { IssuesView } from '@/core/constants/config/constants';
import { Container } from '@/core/components';

interface TeamMemberHeaderSkeletonProps {
	view?: IssuesView;
	className?: string;
	fullWidth?: boolean;
}

export function TeamMemberHeaderSkeleton({
	view = IssuesView.CARDS,
	className,
	fullWidth = true
}: TeamMemberHeaderSkeletonProps) {
	// Note: Removed useAtomValue hook to prevent rendering issues in Suspense fallbacks

	const renderCardHeaderSkeleton = () => (
		<div className="px-8 m-0 w-full h-12 dark:bg-dark-high">
			<div className="px-4 ml-4 w-full h-full md:px-8">
				<div className="flex relative items-center m-0 w-full h-full">
					{/* Team Member column */}
					<div className="flex justify-center items-center ml-6 w-72">
						<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					{/* Task column */}
					<div className="flex-1 flex justify-center md:min-w-[25%] xl:min-w-[30%] !max-w-[250px] px-2 lg:px-4">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					{/* Task Time column */}
					<div className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex justify-center items-center pl-6">
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					{/* Estimate column */}
					<div className="flex justify-center items-center pl-6 2xl:w-52 3xl:w-64">
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					{/* Total Today column */}
					<div className="w-1/5 2xl:w-52 max-w-[13rem] flex justify-end">
						<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					<div className="w-10"></div>
				</div>
			</div>
		</div>
	);

	const renderTableHeaderSkeleton = () => (
		<div className="!overflow-x-auto !mx-0 px-[3.2rem]">
			<div className="font-normal h-14 dark:bg-dark-high py-3 mb-[11px]">
				<div className="flex items-center w-full text-center">
					<div className="w-[29.2%] shrink-0">
						<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
					<div className="w-[31.2%] shrink-0">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
					<div className="w-[15.6%] shrink-0">
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
					<div className="w-[19.5%] shrink-0">
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
					<div className="grow">
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>
			</div>
		</div>
	);

	const renderBlockHeaderSkeleton = () => (
		<div className="hidden justify-between pt-4 font-normal sm:flex dark:bg-dark-high">
			<div className="flex items-center w-9/12">
				{/* Status filter buttons skeleton */}
				{Array.from({ length: 5 }, (_, index) => (
					<div key={index} className="flex gap-2 justify-center items-center py-4 w-1/6 text-center">
						<div className="w-7 h-7 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-md" />
					</div>
				))}
			</div>

			<div className="flex gap-2 justify-end items-center pr-4 w-3/12">
				<div className="flex gap-6">
					<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-1 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse" />
					<div className="w-44 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />
				</div>
			</div>
		</div>
	);

	const renderHeaderSkeleton = () => {
		switch (view) {
			case IssuesView.TABLE:
				return renderTableHeaderSkeleton();
			case IssuesView.BLOCKS:
				return renderBlockHeaderSkeleton();
			case IssuesView.CARDS:
			default:
				return renderCardHeaderSkeleton();
		}
	};

	return (
		<Container fullWidth={fullWidth} className={className}>
			{renderHeaderSkeleton()}
		</Container>
	);
}
