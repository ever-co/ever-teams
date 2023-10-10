import Skeleton from 'react-loading-skeleton';
import { MainLayout } from 'lib/layout';
import { Container, Divider } from 'lib/components';
import TaskCardSkeleton from './TaskCardSkeleton';

const TaskPageSkeleton = () => {
	const taskCards = Array.from({ length: 3 }, (_, index) => {
		return <TaskCardSkeleton key={index} />;
	});

	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Skeleton
						height={20}
						width={180}
						borderRadius={10}
						className="dark:bg-[#272930]"
					/>
					<div className="flex items-center justify-between">
						<div className="w-full flex flex-col">
							<div className="flex items-center">
								<Skeleton
									height={100}
									width={100}
									borderRadius={50}
									className="dark:bg-[#272930] mt-16 mr-8"
								/>
								<div>
									<Skeleton
										height={35}
										width={200}
										borderRadius={25}
										className="dark:bg-[#272930] mt-16"
									/>
									<Skeleton
										height={20}
										width={350}
										borderRadius={25}
										className="dark:bg-[#272930] mt-4"
									/>
								</div>
							</div>

							<div className="flex items-center mt-12">
								<div className="flex-1 flex flex-col mr-10 lg:mt-0 ">
									<div className="flex justify-between items-center space-x-3">
										<div className="flex-1 flex items-center space-x-4 ">
											<Skeleton
												height={30}
												width={180}
												borderRadius={15}
												className="dark:bg-[#272930]"
											/>

											<Skeleton
												height={30}
												width={180}
												borderRadius={15}
												className="dark:bg-[#272930]"
											/>

											<Skeleton
												height={30}
												width={180}
												borderRadius={15}
												className="dark:bg-[#272930]"
											/>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="pr-5">
							<div className="w-full flex flex-col">
								<Skeleton
									height={140}
									width={420}
									borderRadius={20}
									className="dark:bg-dark--theme-light"
								/>
								<div className="flex items-center justify-end">
									<Skeleton
										height={30}
										width={180}
										borderRadius={15}
										className="dark:bg-dark--theme-light mt-16 mr-4"
									/>
									<Skeleton
										height={30}
										width={180}
										borderRadius={15}
										className="dark:bg-dark--theme-light mt-16"
									/>
								</div>
							</div>
						</div>
					</div>
				</Container>
			</div>
			<Container className="mb-10">
				<div className="mt-10">
					<div className="flex space-x-2 items-center">
						<Skeleton
							width={200}
							height={20}
							borderRadius={20}
							className="dark:bg-dark--theme-light"
							baseColor="#E8E8E8"
						/>
						<Divider className="flex-1" />
						<div className="flex space-x-4 items-center">
							<Skeleton
								width={200}
								height={20}
								borderRadius={20}
								className="dark:bg-dark--theme-light"
								baseColor="#E8E8E8"
							/>
						</div>
					</div>

					<TaskCardSkeleton />

					<div className="flex space-x-2 items-center mb-3 mt-16">
						<Skeleton
							width={200}
							height={20}
							borderRadius={20}
							className="dark:bg-dark--theme-light"
							baseColor="#E8E8E8"
						/>
						<Divider className="flex-1" />
						<div className="flex space-x-4 items-center">
							<Skeleton
								width={200}
								height={20}
								borderRadius={20}
								className="dark:bg-dark--theme-light"
								baseColor="#E8E8E8"
							/>
						</div>
					</div>
					{taskCards}
				</div>
			</Container>
		</MainLayout>
	);
};

export default TaskPageSkeleton;
