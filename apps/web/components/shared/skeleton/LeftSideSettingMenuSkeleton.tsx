import Skeleton from 'react-loading-skeleton';

const LeftSideSettingMenuSkeleton = () => {
	return (
		<div className="w-[320px] mt-[36px] mr-[56px]">
			<Skeleton
				width={150}
				height={35}
				borderRadius={20}
				className="dark:bg-[#272930]"
			/>
			<div className="mt-16">
				<Skeleton
					width={200}
					height={25}
					borderRadius={20}
					className="dark:bg-[#272930]"
				/>
			</div>
			<div className="mt-3">
				<Skeleton
					width={200}
					height={25}
					borderRadius={20}
					className="dark:bg-[#272930]"
				/>
			</div>
		</div>
	);
};

export default LeftSideSettingMenuSkeleton;
