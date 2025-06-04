import Skeleton from 'react-loading-skeleton';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { Container, Text } from '@/core/components';
import LeftSideSettingMenuSkeleton from '../common/skeleton/left-side-setting-menu-skeleton';
import DangerZoneSkeleton from '../common/skeleton/danger-zone-skeleton';
import StatusListCard from '../common/skeleton/status-list-card';
import { EverCard } from '../common/ever-card';
import { InputField } from '../duplicated-components/_input';

const SettingsTeamSkeleton = () => {
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
							<div className="w-[98%] md:w-[930px]">
								<div className="flex flex-col items-center justify-between">
									<div className="w-full mt-5">
										<div className="">
											<div className="flex items-center justify-between w-full gap-12 mt-8">
												<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />

												<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
													<InputField type="text" className="" />
												</div>
											</div>
											<div className="flex items-center justify-between w-full gap-12 mt-8">
												<div className="flex flex-col justify-between">
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-[#272930]"
													/>
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-[#272930] mt-8"
													/>
												</div>
												<div className="flex flex-col">
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-[#272930]"
													/>
													<Skeleton
														width={200}
														borderRadius={20}
														className="dark:bg-[#272930] mt-8"
													/>
												</div>
												<div className="flex gap-12">
													<div className="flex items-center gap-4">
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
															className="dark:bg-[#272930]"
														/>
													</div>
												</div>
											</div>
											<div className="flex items-center justify-between w-full gap-12 mt-20">
												<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />

												<div className="flex flex-row items-center justify-between flex-grow-0 w-1/2">
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
														className="dark:bg-[#272930]"
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
								<div className="flex items-center justify-between mt-12">
									<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />
									<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />
								</div>
								<div className="flex items-center justify-between mt-20 ">
									<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />
									<Skeleton width={200} borderRadius={20} className="dark:bg-[#272930]" />
								</div>
							</div>
						</EverCard>
						<EverCard className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
							<Text className="text-2xl text-[#EB6961] font-normal">
								<Skeleton width={200} borderRadius={20} height={25} className="dark:bg-[#272930]" />
							</Text>
							<DangerZoneSkeleton />
						</EverCard>
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default SettingsTeamSkeleton;
