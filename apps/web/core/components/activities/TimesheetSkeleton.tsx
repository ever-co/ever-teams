import { clsxm } from '@/core/lib/utils';
import Skeleton from '../common/skeleton/Skeleton';

function TimesheetSkeleton() {
	return (
		<div
			className={clsxm(
				'flex justify-between items-center w-full',
				'bg-[#ffffffcc] dark:bg-dark--theme rounded-md border',
				'border-gray-100 dark:border-gray-700 text-[#71717A] font-medium my-2 p-2 h-[50px] rounded-sm gap-x-2  px-2 py-2'
			)}
		>
			<div className="flex flex-col w-full gap-4">
				<div className="flex items-center justify-between  gap-4">
					<Skeleton width={80} borderRadius={4} height={10} className="dark:bg-[#272930]" />
					<Skeleton width={80} borderRadius={4} height={10} className="dark:bg-[#272930]" />
				</div>
				<div className="flex items-center justify-between gap-4 w-full">
					<div className="flex items-center gap-2">
						<Skeleton width={20} borderRadius={4} height={20} className="dark:bg-[#272930]" />
						<Skeleton width={200} borderRadius={4} height={20} className="dark:bg-[#272930]" />
						<Skeleton width={40} borderRadius={4} height={20} className="dark:bg-[#272930]" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton width={200} borderRadius={4} height={20} className="dark:bg-[#272930]" />
						<Skeleton width={200} borderRadius={4} height={20} className="dark:bg-[#272930]" />
					</div>
				</div>
			</div>
		</div>
	);
}
export default TimesheetSkeleton;
