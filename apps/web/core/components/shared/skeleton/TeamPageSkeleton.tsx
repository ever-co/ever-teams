import Skeleton from 'react-loading-skeleton';
import { MainLayout, MainHeader } from 'lib/layout';
import { Container } from 'lib/components';
import UserTeamCardSkeletonCard from './UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from './InviteTeamCardSkeleton';
import { Card } from 'lib/components';

const TeamPageSkeleton = () => {
	const TeamCards = Array.from({ length: 5 }, (_, index) => {
		return <UserTeamCardSkeletonCard key={index} />;
	});

	const TeamCardsMobile = Array.from({ length: 3 }, (_, index) => {
		return <UserCard key={index} />;
	});

	return (
		<div>
			<MainLayout className="items-start sm:relative hidden">
				<MainHeader>
					<Container>
						<Skeleton height={20} width={180} borderRadius={10} className="dark:bg-[#353741] " />
						<div className="w-full flex flex-col p-4 rounded-2xl dark:bg-[#1F2126] mt-4">
							<Skeleton height={50} width={850} borderRadius={25} className="dark:bg-[#353741] mt-8" />

							<div className="flex items-center">
								{' '}
								<div className="flex-1 flex flex-col mr-10 lg:mt-0 mt-8">
									<div className="flex flex-col lg:flex-row justify-between items-center space-x-3">
										<div className="flex-1 flex items-center space-x-4 ">
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
						<ul className="flex row font-normal justify-between mb-3 mt-16">
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
			<MainLayout className="sm:hidden relative">
				<MainHeader>
					<Container>
						<div className="w-full flex flex-col p-4 pb-0 rounded-2xl dark:bg-[#1F2126]">
							<div className="flex">
								<Skeleton height={56} width={56} circle={true} className="dark:bg-[#353741] mr-2" />
								<div className="flex items-center">
									<div className="flex-1 flex flex-col mr-10 lg:mt-0 mb-4">
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
					<Card shadow="bigger" className="relative flex flex-col py-4 my-6">
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
							<div className="flex mt-4 justify-between">
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
					</Card>
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
		<Card shadow="bigger" className="relative flex flex-col py-4 my-6">
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
				<div className="flex mt-4 justify-between">
					<Skeleton height={42} width={42} circle={true} className="dark:bg-[#353741] mr-2" />
					<div>
						<Skeleton height={20} width={60} borderRadius={10} className="dark:bg-[#353741]" />
						<Skeleton height={12} width={100} borderRadius={10} className="dark:bg-[#353741] mt-4" />
					</div>
					<Skeleton height={43} width={120} borderRadius={10} className="dark:bg-[#353741]" />
				</div>
			</div>
		</Card>
	);
};

export default TeamPageSkeleton;
