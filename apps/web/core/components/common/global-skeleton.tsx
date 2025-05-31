import { fullWidthState } from '@/core/stores/common/full-width';
import { Container } from '@/core/components';
import { useAtomValue } from 'jotai';
import { cn } from '@/core/lib/helpers';

const GlobalSkeleton = () => {
	const fullWidth = useAtomValue(fullWidthState);
	return (
		<div className="h-screen">
			{/* <div className="w-full h-24 bg-white dark:bg-dark-high"></div> */}

			<header
				className={cn(
					'flex max-h-fit flex-col flex-1  my-auto inset-x-0 w-full min-h-[80px] top-0 h-fit shrink-0 justify-start gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-20 bg-white dark:bg-dark-high !mx-0 !nav-items--shadow dark:!shadow-none border-b-[0.5px] dark:border-b-[0.125rem] border-gray-200 relative z-50 dark:border-b-[#26272C]',
					!fullWidth ? 'lg:px-8' : 'px-8'
				)}
			>
				<div
					role="status"
					className={cn(
						'container flex  gap-3  items-center justify-between h-12 animate-pulse mt',
						!fullWidth ? 'x-container mx-auto' : '!mx-0'
					)}
				>
					<div className="w-20 h-8 bg-gray-200 rounded-full dark:bg-gray-700 me-3" />
					<div className="flex items-center justify-center gap-4 mt-4">
						<div className="w-20 h-8 bg-gray-200 rounded-full dark:bg-gray-700 me-3" />
						<div className="w-20 h-8 bg-gray-200 rounded-full dark:bg-gray-700 me-1" />
						<div className="w-24 h-8 bg-gray-200 rounded-full dark:bg-gray-700" />
						<svg
							className="text-gray-200 size-8 dark:text-gray-700 me-4"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
						</svg>
					</div>
				</div>
			</header>

			<div className="w-full bg-light--theme-dark dark:bg-dark--theme-light">
				<Container fullWidth={fullWidth} className="flex justify-between mt-10">
					<div className="flex justify-start gap-2">
						<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
						<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
					</div>
					<div className="flex justify-end gap-2">
						<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
						<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
					</div>
				</Container>
				{/* Task Input Skeleton */}
				<Container fullWidth={fullWidth} className="pt-12 pb-24">
					<div className="w-full bg-white dark:bg-dark-high h-36 animate-pulse rounded-xl" />
				</Container>
				<div className="flex items-center w-full pb-16 justify-evenly">
					<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
					<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
					<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
					<span className="w-24 h-6 rounded-md bg-light--theme dark:bg-dark animate-pulse" />
				</div>
			</div>
			<div className="w-full py-4 ">
				<Container fullWidth={fullWidth} className="flex flex-col items-stretch gap-6 pt-4">
					<div className="w-full bg-white dark:bg-dark-high h-36 animate-pulse rounded-xl" />
					<div className="w-full bg-white dark:bg-dark-high h-36 animate-pulse rounded-xl" />
					<div className="w-full bg-white dark:bg-dark-high h-36 animate-pulse rounded-xl" />
				</Container>
			</div>
		</div>
	);
};

export default GlobalSkeleton;
