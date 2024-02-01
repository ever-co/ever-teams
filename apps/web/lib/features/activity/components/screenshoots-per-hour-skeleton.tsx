import { clsxm } from '@app/utils';

export const ScreenshootSkeleton = () => {
	return (
		<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
			<h3 className="px-4">
				<span className="w-6 h-2 animate-pulse bg-gray-200 dark:bg-[#26272C]" /> -{' '}
				<span className="w-6 h-2 animate-pulse bg-gray-200 dark:bg-[#26272C]" />
			</h3>
			<div className="flex justify-start items-start flex-wrap ">
				{new Array(6).fill(0).map((el, i) => (
					<div key={i} className={clsxm('min-w-[20rem] xl:w-1/6 p-4')}>
						<ScreenShootItem />
					</div>
				))}
			</div>
		</div>
	);
};

const ScreenShootItem = () => {
	return (
		<div
			className={clsxm(
				'rounded-lg shadow-md hover:shadow-lg cursor-pointer border dark:border-[#26272C] dark:bg-[#191a20] overflow-hidden h-56 w-full'
			)}
		>
			<div className="w-full h-1/2 object-cover bg-gray-200 dark:bg-[#26272C] animate-pulse  relative"></div>
			<div className="w-full h-1/2 p-4">
				<h4 className="font-semibold text-xs w-2/3 py-2 bg-gray-200 dark:bg-[#26272C] animate-pulse "></h4>
				<p className="text-xs mb-6 w-2/3 py-2 bg-gray-200 dark:bg-[#26272C] animate-pulse  my-1"></p>
				<p className="font-semibold text-sm w-2/3 py-2 bg-gray-200 dark:bg-[#26272C] animate-pulse  my-1"></p>
			</div>
		</div>
	);
};
