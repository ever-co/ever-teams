import Skeleton from 'react-loading-skeleton';
import { MainLayout, MainHeader } from 'lib/layout';
import {  Container } from 'lib/components';
import UserTeamCardSkeletonCard from './UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from './InviteTeamCardSkeleton';

const TeamPageSkeleton = () => {
	const TeamCards = Array.from({ length: 5 }, (_, index) => {
		return <UserTeamCardSkeletonCard key={index} />;
	});

	return (
		<MainLayout className='items-start'>
			<MainHeader>
				<Container>
					<Skeleton
						height={20}
						width={180}
						borderRadius={10}
						className="dark:bg-[#353741]"
					/>
					<div className="w-full flex flex-col p-4 rounded-2xl dark:bg-[#1F2126] mt-4">
						<Skeleton
							height={50}
							width={850}
							borderRadius={25}
							className="dark:bg-[#353741] mt-8"
						/>

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
							<Skeleton
								width={80}
								height={20}
								borderRadius={25}
								className="dark:bg-[#353741]"
							/>
						</li>
						<li>
							<Skeleton
								width={80}
								height={20}
								borderRadius={25}
								className="dark:bg-[#353741]"
							/>
						</li>
						<li>
							<Skeleton
								width={80}
								height={20}
								borderRadius={25}
								className="dark:bg-[#353741]"
							/>
						</li>
						<li>
							<Skeleton
								width={80}
								height={20}
								borderRadius={25}
								className="dark:bg-[#353741]"
							/>
						</li>
						<li>
							<Skeleton
								width={80}
								height={20}
								borderRadius={25}
								className="dark:bg-[#353741]"
							/>
						</li>
						<li>
							<Skeleton
								width={80}
								height={20}
								borderRadius={25}
								className="dark:bg-[#353741]"
							/>
						</li>
					</ul>
				</Container>
			</MainHeader>
			<Container className="mb-10">
				{TeamCards}
				<InviteUserTeamCardSkeleton />
			</Container>
		</MainLayout>
	);
};

export default TeamPageSkeleton;
