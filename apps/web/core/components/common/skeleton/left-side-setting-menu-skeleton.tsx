import { Skeleton } from '../skeleton';

const LeftSideSettingMenuSkeleton = () => {
	return (
		<div className="w-[320px] mt-[36px] mr-[56px]">
			<Skeleton className="h-[35px] w-[150px]" />
			<div className="mt-16">
				<Skeleton className="h-[25px] w-[200px]" />
			</div>
			<div className="mt-3">
				<Skeleton className="h-[25px] w-[200px]" />
			</div>
		</div>
	);
};

export default LeftSideSettingMenuSkeleton;
