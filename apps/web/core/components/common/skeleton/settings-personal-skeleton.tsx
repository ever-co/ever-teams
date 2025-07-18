import Skeleton from 'react-loading-skeleton';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { Container, Text } from '@/core/components';
import LeftSideSettingMenuSkeleton from './left-side-setting-menu-skeleton';
import DangerZoneSkeleton from './danger-zone-skeleton';
import { EverCard } from '../../common/ever-card';
import { InputField } from '../../duplicated-components/_input';

const SettingsPersonalSkeleton = () => {
	return (
		<MainLayout>
			<div className="pt-16 pb-4 -mt-8 bg-white dark:bg-dark--theme">
				<Container>
					<Skeleton height={20} width={180} borderRadius={10} className="dark:bg-[#272930]" />
				</Container>
			</div>

			<Container className="mb-10">
				<div className="flex w-full">
					<LeftSideSettingMenuSkeleton />
					<div className="flex flex-col w-full dark:bg-[#191A1F]">
						<EverCard className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
							<Text className="mb-2 text-4xl font-medium">
								<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />
							</Text>
							<Text className="text-base font-normal text-gray-400">
								<Skeleton width={300} borderRadius={20} className="dark:bg-[#272930]" />
							</Text>
							<div className="flex flex-col justify-between items-center">
								<div className="w-full">
									<div className="">
										<div className="flex gap-8 justify-between items-center w-full">
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
								<div className="flex flex-col justify-between items-center">
									<div className="mt-5 w-full">
										<div className="">
											<div className="flex gap-8 justify-between items-center w-full">
												<div className="flex gap-4 justify-between items-center w-full">
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
											<div className="flex gap-8 justify-between items-center mt-8 w-full">
												<div className="flex gap-4 justify-between items-center w-full">
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
													<div className="mt-5">
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
											<div className="flex gap-6 items-center mt-8">
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
											<div className="flex justify-between items-center mt-4 w-full">
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
											<div className="flex gap-5 justify-between items-center mt-8 w-full">
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

											<div className="flex gap-5 justify-between items-center mt-8 w-full">
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

											<div className="flex justify-between items-center mt-8 w-full">
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
						</EverCard>
						<EverCard className="dark:bg-[#272930] p-[32px] mt-[36px]" shadow="bigger">
							<Text className="text-2xl text-[#EB6961] font-normal">
								<Skeleton width={200} borderRadius={20} height={25} className="dark:bg-[#353741]" />
							</Text>
							<DangerZoneSkeleton />
						</EverCard>
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default SettingsPersonalSkeleton;
