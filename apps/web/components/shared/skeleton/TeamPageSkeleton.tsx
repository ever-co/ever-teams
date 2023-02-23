import Skeleton from 'react-loading-skeleton';
import { MainLayout, MainHeader } from 'lib/layout';
import { Card, Container, VerticalSeparator } from 'lib/components';
import { DraggerIcon } from 'lib/components/svgs';
import UserTeamCardSkeleton from './UserTeamCardSkeleton';

const TeamPageSkeleton = () => {
	const TeamCards = Array.from({ length: 5 }, (_, index) => {
		return <UserTeamCardSkeleton key={index} />;
	});

	return (
		<MainLayout>
			<MainHeader>
				<Skeleton
					height={20}
					width={180}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
				<div className="w-full flex flex-col">
					<Skeleton
						height={50}
						width={850}
						borderRadius={25}
						className="dark:bg-dark--theme-light mt-16"
					/>

					<div className="flex items-center">
						{' '}
						<div className="flex-1 flex flex-col mr-10 lg:mt-0 mt-8">
							<div className="flex flex-col lg:flex-row justify-between items-center space-x-3">
								<div className="flex-1 flex items-center space-x-4 ">
									<Skeleton height={25} width={180} borderRadius={15} className="dark:bg-dark--theme-light" />

									<Skeleton height={25} width={180} borderRadius={15} className="dark:bg-dark--theme-light"/>

									<Skeleton height={25} width={180} borderRadius={15} className="dark:bg-dark--theme-light"/>

									<Skeleton height={25} width={180} borderRadius={15} className="dark:bg-dark--theme-light"/>
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
										className="dark:bg-dark--theme-light"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
				<ul className="flex row font-normal justify-between mb-3 mt-16">
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
				</ul>
			</MainHeader>
			<Container className="mb-10">
				{TeamCards}
				<Card shadow="bigger" className="relative flex items-center py-4 my-6">
					<div className="opacity-40 absolute -left-0">
						<DraggerIcon />
					</div>
					<div className="w-[330px] px-4 flex space-x-3 items-center">
						<div className="opacity-40 w-8 h-8 bg-slate-400 rounded-full" />
						<Skeleton
							height={20}
							width={180}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
					</div>
					<VerticalSeparator />

					<div className="w-[330px] px-4 flex items-start">
						<Skeleton
							height={10}
							width={120}
							borderRadius={10}
							className="dark:bg-dark--theme-light mr-2"
						/>
					</div>
					<VerticalSeparator className="ml-2" />

					<div className="flex space-y-2 items-center w-48 justify-center flex-col">
						<Skeleton
							height={20}
							width={120}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
						<Skeleton
							height={10}
							width={160}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
					</div>
					<VerticalSeparator />

					<div className="flex space-y-2 items-center w-48 justify-center flex-col">
						<Skeleton
							height={20}
							width={120}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
						<Skeleton
							height={10}
							width={160}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
					</div>
					<VerticalSeparator />

					<div className="flex space-y-2 items-center w-48 justify-center flex-col">
						<Skeleton
							height={20}
							width={120}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
						<Skeleton
							height={10}
							width={160}
							borderRadius={10}
							className="dark:bg-dark--theme-light"
						/>
					</div>
				</Card>
			</Container>
		</MainLayout>
	);
};

export default TeamPageSkeleton;
