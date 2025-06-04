import Skeleton from 'react-loading-skeleton';
import { MainLayout, MainHeader } from '@/core/components/layouts/default-layout';
import { Container } from '@/core/components';
import UserTeamCardSkeletonCard from './user-team-card-skeleton';
import InviteUserTeamCardSkeleton from './invite-team-card-skeleton';
import { EverCard } from '../common/ever-card';

const TeamPageSkeleton = () => {
	const TeamCards = Array.from({ length: 5 }, (_, index) => {
		return <UserTeamCardSkeletonCard key={index} />;
	});

	const TeamCardsMobile = Array.from({ length: 3 }, (_, index) => {
		return <UserCard key={index} />;
	});

	return (
		<div>
			<MainLayout className="items-start hidden sm:relative">
				<MainHeader>
					<Container>
						<Skeleton height={20} width={180} borderRadius={10} className="dark:bg-[#353741] " />
						<div className="w-full flex flex-col p-4 rounded-2xl dark:bg-[#1F2126] mt-4">
							<Skeleton height={50} width={850} borderRadius={25} className="dark:bg-[#353741] mt-8" />

							<div className="flex items-center">
								{' '}
								<div className="flex flex-col flex-1 mt-8 mr-10 lg:mt-0">
									<div className="flex flex-col items-center justify-between space-x-3 lg:flex-row">
										<div className="flex items-center flex-1 space-x-4 ">
											<Skeleton
												height={25}
												width={180}
												borderRadius={15}
												className="dark:bg-[#353741]"
											/>

											<Skeleton
												height={25}
												width={180}
												borderRadius={15}
												className="dark:bg-[#353741]"
											/>

											<Skeleton
												height={25}
												width={180}
												borderRadius={15}
												className="dark:bg-[#353741]"
											/>

											<Skeleton
												height={25}
												width={180}
												borderRadius={15}
												className="dark:bg-[#353741]"
											/>
										</div>
									</div>
								</div>
								<div style={{ marginTop: '-60px' }}>
									<div className="pr-5">
										<div className="w-full">
											<Skeleton
												height={140}
												width={280}
												borderRadius={10}
												className="dark:bg-[#353741]"
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
						<ul className="flex justify-between mt-16 mb-3 font-normal row">
							<li>
								<Skeleton width={80} height={20} borderRadius={25} className="dark:bg-[#353741]" />
							</li>
							<li>
								<Skeleton width={80} height={20} borderRadius={25} className="dark:bg-[#353741]" />
							</li>
							<li>
								<Skeleton width={80} height={20} borderRadius={25} className="dark:bg-[#353741]" />
							</li>
							<li>
								<Skeleton width={80} height={20} borderRadius={25} className="dark:bg-[#353741]" />
							</li>
							<li>
								<Skeleton width={80} height={20} borderRadius={25} className="dark:bg-[#353741]" />
							</li>
							<li>
								<Skeleton width={80} height={20} borderRadius={25} className="dark:bg-[#353741]" />
							</li>
						</ul>
					</Container>
				</MainHeader>
				<Container className="mb-10">
					{TeamCards}
					<InviteUserTeamCardSkeleton />
				</Container>
			</MainLayout>
			<MainLayout className="relative sm:hidden">
				<MainHeader>
					<Container>
						<div className="w-full flex flex-col p-4 pb-0 rounded-2xl dark:bg-[#1F2126]">
							<div className="flex">
								<Skeleton height={56} width={56} circle={true} className="dark:bg-[#353741] mr-2" />
								<div className="flex items-center">
									<div className="flex flex-col flex-1 mb-4 mr-10 lg:mt-0">
										<Skeleton
											height={15}
											width={163}
											borderRadius={15}
											className="dark:bg-[#353741]"
										/>

										<Skeleton
											height={10}
											width={127}
											borderRadius={15}
											className="dark:bg-[#353741] mt-4"
										/>
									</div>
								</div>
							</div>

							<div className="flex justify-between">
								<Skeleton height={35} width={130} borderRadius={5} className="dark:bg-[#353741]" />
								<Skeleton height={35} width={130} borderRadius={5} className="dark:bg-[#353741]" />
							</div>
							<div className="flex justify-between mt-6">
								<Skeleton height={20} width={80} borderRadius={15} className="dark:bg-[#353741]" />
								<Skeleton height={20} width={80} borderRadius={15} className="dark:bg-[#353741]" />
								<Skeleton height={20} width={80} borderRadius={15} className="dark:bg-[#353741]" />
							</div>
						</div>
					</Container>
				</MainHeader>
				<Container className="mt-4">
					<div className="flex justify-around">
						<Skeleton height={10} width={80} borderRadius={10} className="dark:bg-[#353741]" />
						<Skeleton height={2} width={80} baseColor={'#CFCFD0'} className="dark:bg-[#353741]" />
						<Skeleton height={10} width={80} borderRadius={10} className="dark:bg-[#353741]" />
					</div>
					<EverCard shadow="bigger" className="relative flex flex-col py-4 my-6">
						<div className="flex justify-between pb-4 border-b">
							<div className="flex flex-col items-start">
								<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741]" />
								<Skeleton height={10} width={180} borderRadius={10} className="dark:bg-[#353741]" />
								<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741]" />
								<Skeleton height={10} width={180} borderRadius={10} className="dark:bg-[#353741]" />
							</div>
							<div>
								<Skeleton height={10} width={30} borderRadius={10} className="dark:bg-[#353741] ml-2" />
								<div className="border border-black rounded-full w-12 h-12 border-4 border-[#CFCFD0]"></div>
							</div>
						</div>
						<div>
							<div className="flex justify-between mt-4">
								<Skeleton height={42} width={42} circle={true} className="dark:bg-[#353741] mr-2" />
								<div>
									<Skeleton height={20} width={60} borderRadius={10} className="dark:bg-[#353741]" />
									<Skeleton
										height={12}
										width={100}
										borderRadius={10}
										className="dark:bg-[#353741] mt-4"
									/>
								</div>
								<Skeleton height={43} width={120} borderRadius={10} className="dark:bg-[#353741]" />
							</div>
						</div>
					</EverCard>
					<div className="flex justify-around">
						<Skeleton height={10} width={80} borderRadius={10} className="dark:bg-[#353741]" />
						<Skeleton height={2} width={80} baseColor={'#CFCFD0'} className="dark:bg-[#353741]" />
						<Skeleton height={10} width={80} borderRadius={10} className="dark:bg-[#353741]" />
					</div>
					{TeamCardsMobile}
				</Container>
			</MainLayout>
		</div>
	);
};

export const UserCard = () => {
	return (
		<EverCard shadow="bigger" className="relative flex flex-col py-4 my-6">
			<div className="flex justify-between pb-4 border-b">
				<div className="flex flex-col items-start">
					<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741]" />
					<Skeleton height={10} width={180} borderRadius={10} className="dark:bg-[#353741]" />
					<Skeleton height={10} width={120} borderRadius={10} className="dark:bg-[#353741]" />
					<Skeleton height={10} width={180} borderRadius={10} className="dark:bg-[#353741]" />
				</div>
				<div>
					<Skeleton height={10} width={30} borderRadius={10} className="dark:bg-[#353741] ml-2" />
					<div className="border border-black rounded-full w-12 h-12 border-4 border-[#CFCFD0]"></div>
				</div>
			</div>
			<div>
				<div className="flex justify-between mt-4">
					<Skeleton height={42} width={42} circle={true} className="dark:bg-[#353741] mr-2" />
					<div>
						<Skeleton height={20} width={60} borderRadius={10} className="dark:bg-[#353741]" />
						<Skeleton height={12} width={100} borderRadius={10} className="dark:bg-[#353741] mt-4" />
					</div>
					<Skeleton height={43} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				</div>
			</div>
		</EverCard>
	);
};

export default TeamPageSkeleton;
