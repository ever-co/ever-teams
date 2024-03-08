import { fullWidthState } from '@app/stores/fullWidth';
import { Container } from 'lib/components';
import { Navbar } from 'lib/layout';
import React from 'react';
import { useRecoilValue } from 'recoil';

const GlobalSkeleton = () => {
	const fullWidth = useRecoilValue(fullWidthState);
	return (
		<div className="h-screen">
			{/* <div className="h-24 bg-white dark:bg-dark-high w-full"></div> */}
			<Navbar showTimer={false} className="fixed z-[999]" publicTeam={false} notFound={false} />
			<div className="bg-light--theme-dark dark:bg-dark--theme-light pt-28 w-full">
				<Container fullWidth={fullWidth} className="flex justify-between mt-10">
					<div className="flex justify-start gap-2">
						<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
						<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
					</div>
					<div className="flex justify-end gap-2">
						<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
						<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
					</div>
				</Container>
				{/* Task Input Skeleton */}
				<Container fullWidth={fullWidth} className="pt-12 pb-24">
					<div className="bg-white dark:bg-dark-high w-full h-36 animate-pulse rounded-xl" />
				</Container>
				<div className="flex justify-evenly items-center w-full pb-16">
					<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
					<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
					<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
					<span className="w-24 h-6 bg-light--theme dark:bg-dark animate-pulse rounded-md" />
				</div>
			</div>
			<div className=" w-full py-4">
				<Container fullWidth={fullWidth} className="flex flex-col items-stretch pt-4 gap-6">
					<div className="bg-white dark:bg-dark-high w-full h-36 animate-pulse rounded-xl" />
					<div className="bg-white dark:bg-dark-high w-full h-36 animate-pulse rounded-xl" />
					<div className="bg-white dark:bg-dark-high w-full h-36 animate-pulse rounded-xl" />
				</Container>
			</div>
		</div>
	);
};

export default GlobalSkeleton;
