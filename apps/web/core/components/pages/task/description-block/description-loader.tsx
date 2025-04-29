import Skeleton from 'react-loading-skeleton';
const DescriptionLoader = () => {
	return (
		<div className="w-full flex justify-between flex-col items-end min-h-[70px]  ">
			<div className="flex space-x-1 items-center">
				<Skeleton circle={true} height={22} width={22} />
				<Skeleton circle={true} height={22} width={22} />
				<Skeleton circle={true} height={22} width={22} />
				<Skeleton circle={true} height={22} width={22} />
				<Skeleton circle={true} height={22} width={22} />
				<Skeleton circle={true} height={22} width={22} />
			</div>
			<div className="w-full">
				<Skeleton height={125} width={900} borderRadius={20} />
			</div>
		</div>
	);
};

export default DescriptionLoader;
