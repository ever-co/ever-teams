import Skeleton from 'react-loading-skeleton';
import { MainLayout } from 'lib/layout';
import { Card, Container, Text, InputField } from 'lib/components';
import LeftSideSettingMenuSkeleton from './LeftSideSettingMenuSkeleton';
import DangerZoneSkeleton from './DangerZoneSkeleton';

const SettingsPersonlalSkeleton = () => {
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
				</Container>
			</div>

			<Container className="mb-10" >
				<div className="flex w-full flex-col lg:flex-row">
					<LeftSideSettingMenuSkeleton />
					<div className="flex flex-col w-full dark:bg-[#191A1F]">
					<Card
							className="dark:bg-dark--theme p-[32px] mt-[36px]"
							shadow="bigger"
						>
							<Text className="text-4xl font-medium mb-2">
								<Skeleton
									width={200}
									borderRadius={20}
									className="dark:bg-[#272930]"
								/>
							</Text>
							<Text className="text-base font-normal text-gray-400">
								<Skeleton
									width={300}
									borderRadius={20}
									className="dark:bg-[#272930]"
								/>
							</Text>
							<div className="flex flex-col justify-between items-center">
								<div className="w-full">
									<div className="">
										<div className="flex w-full items-center justify-between gap-8">
											<div className="relative">
												<Skeleton
													circle={true}
													width={80}
													height={80}
													className="relative mt-[32px] dark:bg-[#272930]"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="w-[98%] md:w-[530px]">
								<div className="flex flex-col items-center justify-between">
									<div className="w-full mt-5">
										<div className="">
											<div className="flex items-center justify-between w-full gap-8">
												<div className="flex items-center justify-between w-full gap-4">
													<div>
														<Text className="mb-2 font-normal text-gray-400 text-md">
															<Skeleton
																width={100}
																borderRadius={20}
																className="dark:bg-[#272930]"
															/>
														</Text>
														<InputField
															type="text"
															placeholder=""
															className="md:w-[220px] m-0 h-[54px] dark:bg-[#272930] rounded-lg"
														/>
													</div>
													<div className="mt-[2rem]">
														<InputField
															type="text"
															placeholder=""
															className="md:w-[220px] m-0  h-[54px] dark:bg-[#272930] rounded-lg"
														/>
													</div>
												</div>
												<div className="mt-5">
													<Skeleton
														width={150}
														borderRadius={8}
														height={54}
														className="dark:bg-[#272930]"
													/>
												</div>
											</div>
											<div className="flex items-center justify-between w-full gap-8 mt-8">
												<div className="flex items-center justify-between w-full gap-4">
													<div>
														<Text className="mb-2 font-normal text-gray-400 text-md">
															<Skeleton
																width={100}
																borderRadius={20}
																className="dark:bg-[#272930]"
															/>
														</Text>
														<InputField
															type="text"
															placeholder=""
															className="md:w-[220px] m-0  h-[54px] dark:bg-[#272930] rounded-lg"
														/>
													</div>
													<div className="mt-8">
														<InputField
															type="text"
															placeholder=""
															className="md:w-[220px] h-[54px]  dark:bg-[#272930] rounded-lg"
														/>
													</div>
												</div>
												<div className="mt-5">
													<Skeleton
														width={150}
														borderRadius={8}
														height={54}
														className="dark:bg-[#272930]"
													/>
												</div>
											</div>
											<div className="flex items-center gap-6 mt-8">
												<div className="">
													<Text className="mb-2 font-normal text-gray-400 text-md">
														<Skeleton
															width={200}
															borderRadius={20}
															height={25}
															className="dark:bg-[#272930]"
														/>
													</Text>
												</div>
											</div>
											<div className="flex items-center justify-between w-full mt-4">
												<div className="">
													<Text className="mb-2 font-normal text-gray-400 text-md">
														<Skeleton
															width={300}
															borderRadius={20}
															height={35}
															className="dark:bg-[#272930]"
														/>
													</Text>
												</div>
											</div>
											<div className="flex items-center justify-between w-full gap-5 mt-8 ">
												<div className="">
													<Text className="mb-2 font-normal text-gray-400 text-md">
														<Skeleton
															width={200}
															borderRadius={20}
															height={25}
															className="dark:bg-[#272930]"
														/>
													</Text>
												</div>
											</div>
											<InputField
												type="text"
												placeholder=""
												className="w-full m-0 h-[54px]  dark:bg-[#272930] rounded-lg"
											/>

											<div className="flex items-center justify-between w-full gap-5 mt-8">
												<div className="">
													<Text className="mb-2 font-normal text-gray-400 text-md">
														<Skeleton
															width={200}
															borderRadius={20}
															height={25}
															className="dark:bg-[#272930]"
														/>
													</Text>
												</div>
											</div>

											<div className="flex items-center justify-between w-full mt-8">
												<div className="">
													<Text className="mb-2 font-normal text-gray-400 text-md">
														<Skeleton
															width={300}
															borderRadius={20}
															height={30}
															className="dark:bg-[#272930]"
														/>
													</Text>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</Card>
						<Card
							className="dark:bg-[#272930] p-[32px] mt-[36px]"
							shadow="bigger"
						>
							<Text className="text-2xl text-[#EB6961] font-normal">
								<Skeleton
									width={200}
									borderRadius={20}
									height={25}
									className="dark:bg-[#353741]"
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

export default SettingsPersonlalSkeleton;
