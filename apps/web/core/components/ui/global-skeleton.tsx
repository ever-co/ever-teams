import { fullWidthState } from '@app/stores/fullWidth';
import { Container } from '@/core/components';
import { Navbar } from 'lib/layout';
import { useAtomValue } from 'jotai';

const GlobalSkeleton = () => {
	const fullWidth = useAtomValue(fullWidthState);
	return (
		<div className="h-screen">
			{/* <div className="w-full h-24 bg-white dark:bg-dark-high"></div> */}
			<Navbar showTimer={false} className="fixed z-[100]" publicTeam={false} notFound={false} />
			<div className="w-full bg-light--theme-dark dark:bg-dark--theme-light pt-28">
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
