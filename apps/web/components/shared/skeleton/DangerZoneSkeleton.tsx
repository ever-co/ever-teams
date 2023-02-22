import Skeleton from 'react-loading-skeleton';
import { Text } from 'lib/components';

const DangerZoneSkeleton = () => {
	return (
		<div className="flex flex-col justify-between items-center">
			<div className="w-full mt-5">
				<div className="">
					<div className="flex w-full items-center justify-between gap-6">
						<div className="flex-auto">
							<Text className="text-xl  font-normal">
								<Skeleton
									width={200}
									borderRadius={20}
									height={25}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
						</div>
						<div className="flex-auto">
							<Text className="text-md text-gray-400 font-normal">
								<Skeleton
									width={400}
									borderRadius={20}
									height={15}
									className="dark:bg-dark--theme-light"
								/>
								<Skeleton
									width={100}
									borderRadius={20}
									height={15}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
						</div>
						<div className="flex-auto w-20">
							<Skeleton
								className="float-right dark:bg-dark--theme-light"
								height={45}
								borderRadius={8}
							/>
						</div>
					</div>
					<div className="flex w-full items-center justify-between gap-6 mt-5">
						<div className="flex-auto">
							<Text className="text-xl  font-normal">
								<Skeleton
									className="dark:bg-dark--theme-light"
									width={200}
									borderRadius={20}
									height={25}
								/>
							</Text>
						</div>

						<div className="flex-auto">
							<Text className="text-md text-gray-400 font-normal">
								<Skeleton
									className="dark:bg-dark--theme-light"
									width={400}
									borderRadius={20}
									height={15}
								/>
								<Skeleton
									className="dark:bg-dark--theme-light"
									width={100}
									borderRadius={20}
									height={15}
								/>
							</Text>
						</div>
						<div className="flex-auto w-20">
							<Skeleton
								height={45}
								borderRadius={8}
								className="float-right dark:bg-dark--theme-light"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DangerZoneSkeleton;
