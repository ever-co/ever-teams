import Skeleton from 'react-loading-skeleton';
const TitleLoader = () => {
	return (
		<div className="w-full flex justify-between items-start min-h-[70px]  ">
			<Skeleton height={25} width={800} borderRadius={20} />
			<div className="flex space-x-5 items-center">
				<Skeleton circle={true} height={25} width={25} />
			</div>
		</div>
	);
};

export default TitleLoader;
