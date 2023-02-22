import Skeleton from 'react-loading-skeleton';
import { MainLayout } from 'lib/layout';
import { Card, Container, Text, InputField } from 'lib/components';
import LeftSideSettingMenuSkeleton from './LeftSideSettingMenuSkeleton';
import StatusListCard from './StatusListCard';
import DangerZoneSkeleton from './DangerZoneSkeleton';

const SettingsTeamSkeleton = () => {
	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Skeleton
						height={20}
						width={180}
						borderRadius={10}
						className="dark:bg-dark--theme-light"
					/>
				</Container>
			</div>
			<Container className="mb-10">
				<div className="flex w-full">
					<LeftSideSettingMenuSkeleton />
					<div className="flex flex-col w-full">
						<Card
							className="dark:bg-dark--theme p-[32px] mt-[36px]"
							shadow="bigger"
						>
							<Text className="text-4xl font-medium mb-2">
								<Skeleton
									width={200}
									borderRadius={20}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
							<Text className="text-base font-normal text-gray-400">
								<Skeleton
									width={300}
									borderRadius={20}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
							<div className="w-[98%] md:w-[930px]">
								<div className="flex flex-col justify-between items-center">
									<div className="w-full mt-5">
										<div className="">
											<div className="flex w-full items-center justify-between gap-12 mt-8">
												<Skeleton
													width={200}
													borderRadius={20}
													className="dark:bg-dark--theme-light"
												/>

												<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
													<InputField type="text" className="" />
												</div>
											</div>
											<div className="flex w-full items-center justify-between gap-12 mt-8">
												<div className="flex flex-col justify-between">
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-dark--theme-light"
													/>
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-dark--theme-light mt-8"
													/>
												</div>
												<div className="flex flex-col">
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-dark--theme-light"
													/>
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-dark--theme-light mt-8"
													/>
												</div>
												<div className="flex gap-12">
													<div className="flex gap-4 items-center">
														<InputField
															type="text"
															className="mb-0 h-[54px]"
															wrapperClassName="mb-0 h-[54px]"
															disabled={true}
														/>
														<Skeleton
															width={105}
															height={54}
															borderRadius={8}
															className="dark:bg-dark--theme-light"
														/>
													</div>
												</div>
											</div>
											<div className="flex w-full items-center justify-between gap-12 mt-20">
												<Skeleton
													width={200}
													borderRadius={20}
													className="dark:bg-dark--theme-light"
												/>

												<div className="flex flex-row flex-grow-0 items-center justify-between w-1/2">
													<InputField type="text" className="" />
												</div>
												<div className="flex items-center justify-between gap-12">
													<InputField type="text" className="" />
													<InputField type="text" className="" />
												</div>
											</div>
											<div className="flex flex-col float-right mr-8">
												<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem]">
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-dark--theme-light"
													/>
												</Text>
												<div className="flex gap-3 mt-4">
													<InputField
														type="text"
														className="mb-0 h-[54px] w-80"
														wrapperClassName="mb-0 h-[54px]"
														disabled={true}
													/>
													<InputField
														type="text"
														className="mb-0 h-[54px] w-80"
														wrapperClassName="mb-0 h-[54px]"
														disabled={true}
													/>
												</div>
												<div className="flex w-full gap-3 mt-4">
													<InputField
														type="text"
														className="mb-0 h-[54px] w-80"
														wrapperClassName="mb-0 h-[54px]"
														disabled={true}
													/>
													<InputField
														type="text"
														className="mb-0 h-[54px] w-80"
														wrapperClassName="mb-0 h-[54px]"
														disabled={true}
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<StatusListCard />
							<div className="w-1/2 mb-8">
								<div className="flex justify-between items-center mt-12">
									<Skeleton
										width={200}
										borderRadius={20}
										className="dark:bg-dark--theme-light"
									/>
									<Skeleton
										width={200}
										borderRadius={20}
										className="dark:bg-dark--theme-light"
									/>
								</div>
								<div className="flex justify-between items-center mt-20 ">
									<Skeleton
										width={200}
										borderRadius={20}
										className="dark:bg-dark--theme-light"
									/>
									<Skeleton
										width={200}
										borderRadius={20}
										className="dark:bg-dark--theme-light"
									/>
								</div>
							</div>
						</Card>
						<Card
							className="dark:bg-dark--theme p-[32px] mt-[36px]"
							shadow="bigger"
						>
							<Text className="text-2xl text-[#EB6961] font-normal">
								<Skeleton
									width={200}
									borderRadius={20}
									height={25}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
							<DangerZoneSkeleton />
						</Card>
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default SettingsTeamSkeleton;
