import { clsxm } from '@app/utils';

export function ScreenshootTab() {
	return (
		<div>
			<div className="flex items-center gap-4">
				{/* Stats cards */}
				<div className="shadow rounded-md sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4 h-28 dark:bg-[#26272C]">
					<span>Activity</span>
					<h2 className="text-3xl">67.23 %</h2>
					{/* TODO: progress bar */}
				</div>
				<div className="shadow rounded-md sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4 h-28 dark:bg-[#26272C]">
					<span>Total Hours</span>
					<h2 className="text-3xl">{'1:32:25'}</h2>
					{/* TODO: progress bar */}
				</div>
			</div>
			<div className="p-4 my-4 rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
				<h3>
					{'05:00'} - {'06:00'}
				</h3>
				<div className="flex justify-start items-start gap-4 my-4">
					{new Array(6).fill(0).map((el, i) => (
						<div
							key={i}
							className={clsxm(
								'rounded-md shadow-md border dark:border-[#26272C] overflow-hidden h-56 xl:w-1/6'
							)}
						>
							<div className="w-full h-1/2 object-cover bg-gray-200 dark:bg-[#26272C] ">
								{/* TODO: image here */}
							</div>
							<div className="w-full h-1/2 p-4">
								<h4 className="font-semibold text-sm">
									{'05:40'} - {'05:58'}
								</h4>
								<p className="text-xs mb-8">{'Saturday, January 6, 2024 '}</p>
								<div>{/* TODO: progress bar */}</div>
								<p className="font-semibold text-sm">91 % of 10 Minutes</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
